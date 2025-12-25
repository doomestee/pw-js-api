export class AuthError extends Error {
    constructor(message: string,
        /**
         * The websocket close event code.
         */
        public code: number
    ) {
        super(message);
    }
}

export class APIError extends Error {
    constructor(message: string,
        /**
         * Code identifying the source behind this error.
         */
        public code: "MISSING_VERSION"|"MISSING_BLOCKS"
    ) {
        super(message);
    }
}