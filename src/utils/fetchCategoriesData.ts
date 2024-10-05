import axios from 'axios';
import { Category } from '../types/types';

export const fetchCategoriesData = async (
  categories: Category[],
  selectionRange: string,
  sheetId: string,
  apiKey: string
) => {
  try {
    const storedMenuItems = localStorage.getItem('menuItems');
    const storedMenuItemsTotal = localStorage.getItem('totalItem');

    // If we have stored menu items, parse and validate the length
    if (storedMenuItems && typeof storedMenuItems === 'string') {
      const parsedItems = JSON.parse(storedMenuItems);
      
      // Calculate the length of parsedItems
      const length = parsedItems.reduce(
        (acc: number, item: any) => acc + (Array.isArray(item) ? item.length : 0),
        0
      );

      console.log('Parsed Items:', parsedItems);
      console.log('Calculated Length:', length);

      // If storedMenuItemsTotal is present and matches the calculated length
      if (typeof storedMenuItemsTotal === 'string') {
        const parsedTotalItem = parseInt(storedMenuItemsTotal, 10);
        console.log('Parsed totalItem from localStorage:', parsedTotalItem);
        console.log('Calculated length from parsedItems:', length);

        if (parsedTotalItem === length) {
          console.log('match');
          return parsedItems;
        } else {
          console.log('No match. TotalItem:', parsedTotalItem, 'Length:', length);
        }
      }
    }

    // Fetch total item count from Google Sheets API
    let total: number = 0;
    try {
      const response = await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/total!A1?key=${apiKey}`
      );
      
      // Ensure the total is a valid number and parse it correctly
      total = parseInt(response.data.values[0][0].replace(/\D/g, ''), 10);
      console.log('Fetched total from API:', total);

      // Store the fetched total in localStorage
      localStorage.setItem('totalItem', JSON.stringify(total));
    } catch (error) {
      console.error('Error fetching the total:', error);
    }

    // Fetch the menu items for each category from the Google Sheets API
    const promises = categories.map((category) =>
      axios
        .get(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${category.name}${selectionRange}?key=${apiKey}`
        )
        .then((response) => response.data.values)
        .catch((error) => {
          console.error(`Error fetching data for category ${category.name}:`, error);
          return null;
        })
    );

    // Resolve all promises and filter out any null values
    const responses = await Promise.all(promises);
    const menuItems = responses.filter(Boolean);

    // Store the fetched menuItems in localStorage
    localStorage.setItem('menuItems', JSON.stringify(menuItems));

    // Return the menu items
    return menuItems;
  } catch (error) {
    console.error('Error fetching categories data:', error);
    throw error;
  }
};
