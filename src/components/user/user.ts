export interface User {
    id?: number,
    email: string,
    password: string,
    role?: any,
    permissions?: any[],
    extId?: string,
    services: string
}