import { dispatchMessage } from '../handler/dispatcher.js'
import type { FastifyInstance } from 'fastify'
import chalk from 'chalk'

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
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
            console.log('WebSocket connection opened.')

            const subscriptionMessage = {
                APIkey: this.apiKey,
                BoundingBoxes: [
                    [
                        [-180, -90],
                        [180, 90],
                    ],
                ],
            }

            this.ws?.send(JSON.stringify(subscriptionMessage))

            this.reconnectAttempts = 0
        }

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error)
        }

        this.ws.onclose = () => {
            console.log('WebSocket connection closed.')

            if (this.reconnectAttempts < this.maxRetries) {
                const delay =
                    this.retryDelay * Math.pow(2, this.reconnectAttempts - 1)
                setTimeout(() => this.createSocket(), delay)
                console.log(
                    `Reconnecting WebSocket... attempt ${this.reconnectAttempts + 1}`
                )
                this.reconnectAttempts++
            }
        }

        

        this.ws.onmessage = async (event) => {

            this.messageCounter++

            try {
                let payload: any = event.data

                if (typeof payload !== 'string') {
                    if (
                        typeof Blob !== 'undefined' &&
                        payload instanceof Blob
                    ) {
                        payload = await payload.text()
                    } else if (payload instanceof ArrayBuffer) {
                        payload = new TextDecoder().decode(
                            new Uint8Array(payload)
                        )
                    } else {
                        payload = String(payload)
                    }
                }

                const msg = JSON.parse(payload)
                await dispatchMessage(msg, this.fastify)
            } catch (err) {
                console.error('Failed to parse WebSocket message:', err)
            }
        }
    }

    displayCounter() {
        console.log(chalk.magenta(`Total messages received in the last ${this.displayInterval} ms: ${this.messageCounter}`))
        this.messageCounter = 0
    }
}
