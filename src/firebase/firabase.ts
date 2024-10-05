import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';
import { firebaseConfig } from '../firebaseConfig';

const firebase = initializeApp(firebaseConfig);
const database = getDatabase(firebase);

export const saveWasteItemToFirebase = async (
    date: string,
    wasteItems: { [itemName: string]: number }
) => {
    try {
        const tablePath = `wasteItems/${date}`;
        const snapshot = await get(ref(database, tablePath));
        const existingItems = snapshot.val() || {};

        const updatedItems = { ...existingItems };
        for (const [itemName, amount] of Object.entries(wasteItems)) {
            updatedItems[itemName] = (updatedItems[itemName] || 0) + amount;
        }

        await set(ref(database, tablePath), updatedItems);
        return true;
    } catch (error) {
        console.error('Error saving waste items:', error);
        return false;
    }
};