import { Category } from "../types/types";
import bunImage from "../assets/bun.png";

export const CATEGORIES: Category[] = [
    { id: 0, name: 'Бургери', imageUrl: 'https://s7d1.scene7.com/is/image/mcdonalds/McD_burgers_roll_2023_160x160:category-panel-left-desktop' },
    { id: 1, name: 'Снеки', imageUrl: 'https://s7d1.scene7.com/is/image/mcdonalds/nav_chicken_160x160:category-panel-left-desktop' },
    { id: 2, name: 'Картопля', imageUrl: 'https://s7d1.scene7.com/is/image/mcdonalds/menu_frenchfries_160x160:category-panel-left-desktop' },
    { id: 3, name: 'Соуси', imageUrl: 'https://s7d1.scene7.com/is/image/mcdonalds/nav_sauces_160x160:category-panel-left-desktop' },
    { id: 4, name: 'Напої', imageUrl: 'https://s7d1.scene7.com/is/image/mcdonalds/McD_drinks_2023_160x160:category-panel-left-desktop' },
    { id: 5, name: 'Десерти', imageUrl: 'https://s7d1.scene7.com/is/image/mcdonalds/nav_desserts___shakes_160x160-1:category-panel-left-desktop' },
    { id: 6, name: 'Інгредієнти', imageUrl: bunImage },
];

export const NUMERIC_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
export const RW_CATEGORY_ID = 6;
export const GOOGLE_SHEET_ID = '1jUjBdjUQhKcWLtoId41H5wb6wWovQt_7WP2BIKcHcnE';
export const GOOGLE_SHEET_SELECTION_RANGE = '!A1:B40';
export const GOOGLE_API_KEY = 'AIzaSyDTXQTVuGPg-KXcc1EXXWr7Bmyin-CRaD8';
export const MNG_PASSWORD = '4444';