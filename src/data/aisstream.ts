import { dispatchMessage } from '../handler/dispatcher.js'
import type { FastifyInstance } from 'fastify'
import chalk from 'chalk'
import WebSocket from 'ws'
import net from 'net'
import tls from 'tls'

export class AISStreamClient {
    private ws: WebSocket | null = null
    private apiKey: string
    private url: string
    private fastify: FastifyInstance
    private reconnectAttempts = 0
    private readonly maxRetries = 5
    private readonly retryDelay = 5000

    private messageCounter = 0
    private displayInterval: number = 1000 * 10

    constructor(fastify: FastifyInstance) {
        this.fastify = fastify
        this.apiKey = process.env.AISSTREAM_API_KEY || ''
        this.url = 'wss://stream.aisstream.io/v0/stream'
        if (!this.apiKey) {
            throw new Error(
                'AISSTREAM_API_KEY is not set in environment variables.'
            )
        }

        setInterval(() => this.displayCounter(), this.displayInterval)
    }

    async createSocket() {
        if (this.ws) {
            this.ws.close()
        }

        const certValid = await checkAisStreamCert()
        if (!certValid) {
            if (process.env.ALLOW_INVALID_CERTS === 'true') {
                console.warn(
                    chalk.yellow(
                        'Warning: AISStream SSL certificate is invalid or expired. Proceeding with insecure connection.'
                    )
                )
            } else {
                console.error(
                    chalk.red(
                        'Error: AISStream SSL certificate is invalid or expired. Set ALLOW_INVALID_CERTS=true to proceed anyway.'
                    )
                )
                return
            }
        }

        const wsOptions = certValid
            ? {}
            : {
                  rejectUnauthorized: false,
              }

        this.ws = new WebSocket(this.url, wsOptions)

        this.ws.on('open', () => {
            console.log('WebSocket connection opened.')

            const subscriptionMessage = {
                APIKey: this.apiKey,
                Apikey: this.apiKey,
                BoundingBoxes: [
                    [
                        [-90, -180],
                        [90, 180],
                    ],
                ],
                FilterMessageTypes: [
                    'PositionReport',
                    'ShipStaticData',
                    'BaseStationReport',
                ],
            }

            this.ws?.send(JSON.stringify(subscriptionMessage))
            console.log('Sent AISStream subscription message.')

            this.reconnectAttempts = 0
        })

        this.ws.on('error', (error) => {
            console.error('WebSocket error:', error)
        })

        this.ws.on('close', (code, reasonBuffer) => {
            const reason = reasonBuffer.toString() || 'no reason provided'
            console.log(
                `WebSocket connection closed (code: ${code}, reason: ${reason}).`
            )

            if (this.reconnectAttempts < this.maxRetries) {
                const delay =
                    this.retryDelay * Math.pow(2, this.reconnectAttempts)
                setTimeout(() => this.createSocket(), delay)
                console.log(
                    `Reconnecting WebSocket... attempt ${this.reconnectAttempts + 1}`
                )
                this.reconnectAttempts++
            }
        })

        this.ws.on('message', async (rawData) => {
            this.messageCounter++

            try {
                const payload =
                    typeof rawData === 'string' ? rawData : rawData.toString()

                const msg = JSON.parse(payload)

                if (msg?.error) {
                    console.error(
                        'AISStream subscription/server error:',
                        msg.error
                    )
                    return
                }

                await dispatchMessage(msg, this.fastify)
            } catch (err) {
                console.error('Failed to parse WebSocket message:', err)
            }
        })
    }

    displayCounter() {
        console.log(
            chalk.magenta(
                `Total messages received in the last ${this.displayInterval} ms: ${this.messageCounter}`
            )
        )
        this.messageCounter = 0
    }
}

export function checkAisStreamCert(): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = net.createConnection(443, 'stream.aisstream.io', () => {
            const tlsSocket = tls.connect(
                {
                    socket,
                    servername: 'stream.aisstream.io',
                    rejectUnauthorized: false,
                },
                () => {
                    const cert = tlsSocket.getPeerCertificate()

                    if (!cert || !cert.valid_to) {
                        tlsSocket.destroy()
                        return resolve(false)
                    }

                    const notAfter = new Date(cert.valid_to)
                    const now = new Date()

                    tlsSocket.destroy()
                    resolve(notAfter > now)
                }
            )

            tlsSocket.on('error', (err) => {
                console.error('TLS connection error:', err)
                resolve(false)
            })
        })
    })
}
