import { dispatchMessage } from './dispatcher.js'
import type { FastifyInstance } from 'fastify'

export class AISStreamClient {
    private ws: WebSocket | null = null
    private apiKey: string
    private url: string
    private fastify: FastifyInstance

    constructor(fastify: FastifyInstance) {
        this.fastify = fastify
        this.apiKey = process.env.AISSTREAM_API_KEY || ''
        this.url = 'wss://stream.aisstream.io/v0/stream'
        if (!this.apiKey) {
            throw new Error(
                'AISSTREAM_API_KEY is not set in environment variables.'
            )
        }
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
        }

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error)
        }

        this.ws.onclose = () => {
            console.log('WebSocket connection closed.')
        }

        this.ws.onmessage = async (event) => {
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
}
