export function parseAisStreamTimestamp(timestamp: string): string {
    try {
        return timestamp
            .replace(' UTC', '')
            .replace(/(\.\d{3})\d+/, '$1')
            .replace(' +0000Z', 'Z')
    } catch (err) {
        console.error('Error parsing AIS stream timestamp:', err)
        return ''
    }
}

export function parseDateForDatabase(date: Date): string {
    try {
        const yyyy = date.getUTCFullYear()
        const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
        const dd = String(date.getUTCDate()).padStart(2, '0')
        const hh = String(date.getUTCHours()).padStart(2, '0')
        const min = String(date.getUTCMinutes()).padStart(2, '0')
        const ss = String(date.getUTCSeconds()).padStart(2, '0')
        const mmm = String(date.getUTCMilliseconds()).padStart(3, '0')

        return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}.${mmm}`
    } catch (err) {
        console.error('Error formatting timestamp for database:', err)
        return ''
    }
}
