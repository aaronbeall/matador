// This file exports TypeScript interfaces and types used throughout the application.

export interface AppProps {
    title: string;
    description?: string;
}

export type User = {
    id: number;
    name: string;
    email: string;
};

export interface State {
    count: number;
    users: User[];
}