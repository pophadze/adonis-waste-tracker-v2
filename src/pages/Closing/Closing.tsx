import React, { useEffect, useState } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, child, remove, set } from 'firebase/database';
import { firebaseConfig } from '../../firebaseConfig';
import {
  Box,
  Checkbox,
  Button,
  Tab,
  Tabs,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  styled,
  Stack,
  Chip,
} from '@mui/material';
import { Delete as DeleteIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import ApproveByPassword from '../../HOC/ApproveByPassword';

// Initialize Firebase
const firebase = initializeApp(firebaseConfig);
const database = getDatabase(firebase);

// Types
interface WasteItem {
  [key: string]: number;
}

interface DayData {
  date: string;
  data: WasteItem | null;
}

interface SelectedItems {
  [key: string]: boolean;
}

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  margin: theme.spacing(2, 0),
  backgroundColor: theme.palette.background.default,
}));

const HeaderBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(4),
}));

const LegendBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  flexWrap: 'wrap',
}));

const TabPanel: React.FC<{
  children?: React.ReactNode;
  index: number;
  value: number;
}> = ({ children, value, index }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`waste-tabpanel-${index}`}
    aria-labelledby={`waste-tab-${index}`}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const moveItemToWastedState = async (date: string, itemName: string) => {
  try {
    const itemPath = `wasteItems/${date}/${itemName}`;
    const wastedItemPath = `wasteItems/${date}/${itemName}--wasted`;

    const wastedSnapshot = await get(child(ref(database), wastedItemPath));
    const wastedAmount = wastedSnapshot.exists() ? wastedSnapshot.val() : 0;

    const snapshot = await get(child(ref(database), itemPath));
    if (snapshot.exists()) {
      const originalAmount = snapshot.val();
      const totalAmount = originalAmount + wastedAmount;

      await remove(ref(database, itemPath));
      await set(ref(database, wastedItemPath), totalAmount);
    }
  } catch (error) {
    console.error(`Error moving "${itemName}" to wasted state:`, error);
    throw error;
  }
};

const loadPreviousDaysData = async (): Promise<DayData[]> => {
  try {
    const currentDate = new Date();
    const dates: string[] = [];

    for (let i = 0; i < 3; i++) {
      const previousDate = new Date(currentDate);
      previousDate.setDate(previousDate.getDate() - i);

      const day = previousDate.toLocaleDateString('uk-UA', { day: '2-digit' });
      const month = previousDate.toLocaleDateString('uk-UA', { month: '2-digit' });

      for (let shift = 1; shift <= 2; shift++) {
        const shiftLabel = shift === 1 ? '1SH' : '2SH';
        dates.push(`${day}-${month} ${shiftLabel}`);
      }
    }

    const previousDaysData = await Promise.all(
      dates.map(async (date) => {
        const snapshot = await get(child(ref(database), `wasteItems/${date}`));
        return {
          date,
          data: snapshot.exists() ? snapshot.val() : null,
        };
      })
    );

    return previousDaysData;
  } catch (error) {
    console.error('Error loading previous days data:', error);
    return [];
  }
};

const Closing: React.FC = () => {
  const [previousDaysData, setPreviousDaysData] = useState<DayData[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItems>({});
  const [tabIndex, setTabIndex] = useState(0);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await loadPreviousDaysData();
        setPreviousDaysData(data);
      } catch (err) {
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleItemToggle = (itemName: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  const handleMoveSelectedItems = async (date: string) => {
    try {
      await Promise.all(
        Object.entries(selectedItems)
          .filter(([_, isSelected]) => isSelected)
          .map(([itemName]) => moveItemToWastedState(date, itemName))
      );

      setSelectedItems({});
      const updatedData = await loadPreviousDaysData();
      setPreviousDaysData(updatedData);
    } catch (error) {
      setError('Failed to move items. Please try again.');
    }
  };

  const handleSelectAll = (date: string) => {
    const currentData = previousDaysData.find(day => day.date === date)?.data;
    if (!currentData) return;

    const newSelected = !isSelectAll;
    const updatedItems: SelectedItems = {};

    Object.keys(currentData).forEach(itemName => {
      if (!itemName.includes('--wasted')) {
        updatedItems[itemName] = newSelected;
      }
    });

    setSelectedItems(updatedItems);
    setIsSelectAll(newSelected);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', p: 3 }}>
      <HeaderBox>
        <Typography variant="h4" component="h1">
          Історія списання
        </Typography>
        <LegendBox>
          <Chip label="Списано RW" color="primary" />
          <Chip label="Списано CW" color="success" />
          <Chip label="Очікує RW" variant="outlined" color="primary" />
          <Chip label="Очікує CW" variant="outlined" color="success" />
        </LegendBox>
      </HeaderBox>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <StyledPaper>
        <Tabs
          value={tabIndex}
          onChange={(_, newValue) => setTabIndex(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {previousDaysData.map(({ date }) => (
            <Tab key={date} label={date} />
          ))}
        </Tabs>

        {previousDaysData.map(({ date, data }, index) => (
          <TabPanel key={date} value={tabIndex} index={index}>
            {data ? (
              <>
                <List>
                  {/* Wasted Items */}
                  {Object.entries(data)
                    .filter(([itemName]) => itemName.includes('--wasted'))
                    .map(([itemName, amount]) => (
                      <ListItem
                        key={itemName}
                        sx={{
                          bgcolor: itemName.includes('RW') ? 'primary.light' : 'success.light',
                          borderRadius: 1,
                          mb: 1,
                        }}
                      >
                        <ListItemIcon>
                          <CheckCircleIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${itemName.replace('--wasted', '')}: ${amount}`}
                        />
                      </ListItem>
                    ))}

                  {/* Pending Items */}
                  {Object.entries(data)
                    .filter(([itemName]) => !itemName.includes('--wasted'))
                    .map(([itemName, amount]) => (
                      <ListItem
                        key={itemName}
                        sx={{
                          bgcolor: itemName.includes('RW') ? 'primary.lighter' : 'success.lighter',
                          borderRadius: 1,
                          mb: 1,
                        }}
                      >
                        <ListItemIcon>
                          <Checkbox
                            checked={selectedItems[itemName] || false}
                            onChange={() => handleItemToggle(itemName)}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${itemName}: ${amount}`}
                        />
                      </ListItem>
                    ))}
                </List>

                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<DeleteIcon />}
                    disabled={!Object.values(selectedItems).some(Boolean)}
                    onClick={() => handleMoveSelectedItems(date)}
                  >
                    Списати обрані
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handleSelectAll(date)}
                  >
                    {isSelectAll ? 'Скасувати вибір' : 'Обрати всі'}
                  </Button>
                </Stack>
              </>
            ) : (
              <Alert severity="warning">
                Відсутні дані за обраний період
              </Alert>
            )}
          </TabPanel>
        ))}
      </StyledPaper>
    </Box>
  );
};

export default ApproveByPassword(Closing);