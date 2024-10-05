export interface WasteItem {
    product: string;
    amount: number;
    category: 'Напої' | null;
}

export interface Category {
    id: number;
    name: string;
    imageUrl: string;
}
