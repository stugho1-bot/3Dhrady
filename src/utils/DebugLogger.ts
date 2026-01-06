// Debug Logger for Hradní Bourač
// Helps diagnose visual issues like whiteout

class DebugLogger {
    private logs: Array<{ timestamp: number; category: string; message: string; data?: any }> = [];
    private enabled: boolean = true;

    log(category: string, message: string, data?: any) {
        if (!this.enabled) return;

        const entry = {
            timestamp: Date.now(),
            category,
            message,
            data
        };

        this.logs.push(entry);

        // Console output with color coding
        const colors: Record<string, string> = {
            EXPLOSION: '#ff0000',
            EFFECT: '#00ff00',
            RENDER: '#0000ff',
            ERROR: '#ff00ff',
            STATE: '#ffff00'
        };

        console.log(
            `%c[${category}] ${message}`,
            `color: ${colors[category] || '#ffffff'}; font-weight: bold`,
            data || ''
        );
    }

    getRecentLogs(count: number = 50) {
        return this.logs.slice(-count);
    }

    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }

    clear() {
        this.logs = [];
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }
}

export const debugLogger = new DebugLogger();

// Expose to window for browser console access
if (typeof window !== 'undefined') {
    (window as any).debugLogger = debugLogger;
}
