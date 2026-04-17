/**
 * OpenShips API - Open Source Vessel Tracking
 * 
 * These routes generate Open Graph HTML pages for vessels on-demand.
 * Server-side bot detection redirects regular users to the vessel page.
**/

import type { FastifyInstance, FastifyRequest } from 'fastify'
import { aisTypeToString } from '../../../utils/aisUtils.js'
import type { MMSIParam } from '../types.js'

// Social media bots
const BOT_USER_AGENTS = /facebookexternalhit|Twitterbot|LinkedInBot|Googlebot|Slurp|DuckDuckBot|Baiduspider|YandexBot|Sogou|Exabot|WhatsApp|Telegram|Discord/i

function isBot(request: FastifyRequest): boolean {
    const userAgent = request.headers['user-agent'] || ''
    return BOT_USER_AGENTS.test(userAgent)
}

export default function openGraphRoutes(fastify: FastifyInstance) {
    fastify.get<{ Params: MMSIParam }>('/vessel/:mmsi', {
        schema: {
            params: {
                type: 'object',
                properties: {
                        mmsi: { type: 'integer', minimum: 100000000, maximum: 999999999 },
                },
                required: ['mmsi'],
            },
        },
    }, async (request, reply) => {
        const { mmsi } = request.params

        try {
            const vesselInfo = await fastify.mariadb.query(
                'SELECT vesselName, vesselType FROM static_ship_data WHERE mmsi = ?',
                [mmsi]
            )

            if (!vesselInfo || vesselInfo.length === 0) {
                fastify.log.warn(`Vessel ${mmsi} not found in database`)
                return reply.code(404).send({ 
                    success: false, 
                    error: 'Vessel not found' 
                })
            }

            const vesselRecord = vesselInfo[0]
            const vesselName = vesselRecord.vesselName || 'Unknown Vessel'
            
            let vesselType = 'Unknown Type'
            if (vesselRecord.vesselType) {
                const typeStr = await aisTypeToString(vesselRecord.vesselType)
                vesselType = typeStr?.split(',')[0]?.trim() ?? 'Unknown Type'
            }

            // Generate OG HTML
            const html = `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vessel ${vesselName}</title>
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Vessel ${vesselName}" />
        <meta property="og:description" content="Information about vessel ${vesselName} of type ${vesselType}" />
        <meta property="og:url" content="https://api.openships.de/og/vessel/${mmsi}.html" />
        <meta property="og:site_name" content="OpenShips" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content="${new Date().toISOString()}" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vessel ${vesselName}" />
        <meta name="twitter:description" content="Information about vessel ${vesselName} of type ${vesselType}" />
        <meta name="twitter:site" content="@OpenShips" />
    </head>
    <body>
        <p>If you're seeing this, <a href="https://openships.de/vessel/${mmsi}">click here</a> to view the vessel information.</p>
    </body>
</html>`

            // Bot detection: Send OG HTML to bots, redirect regular users
            if (isBot(request)) {
                fastify.log.debug(`OG page served to bot for vessel ${mmsi}`)
                return reply.type('text/html').send(html)
            } else {
                fastify.log.debug(`Redirecting user to vessel page ${mmsi}`)
                return reply.redirect(`https://openships.de/vessel/${String(mmsi)}`)
            }

        } catch (error) {
            fastify.log.error({ error, mmsi }, 'Error generating OG page for vessel')
            reply.code(500).send({ 
                success: false, 
                error: 'Failed to generate OG page' 
            })
        }
    })
}
