export interface User {
    id?: number,
    email: string,
    password: string,
    roles?: any[],
    permissions?: any[],
    extId?: string,
    services: string
}