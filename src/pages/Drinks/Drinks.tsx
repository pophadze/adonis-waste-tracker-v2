import React, { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, child } from 'firebase/database';
import { firebaseConfig } from '../../firebaseConfig';
import {
  Box,
  Tab,
  Tabs,
  Alert,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  styled,
  Container,
  Divider,
  CircularProgress,
} from '@mui/material';
import { convertingValues } from '../../static-data/convertingValues';
import { convertingFixing } from '../../static-data/convertingFixing';
import ApproveByPassword from '../../HOC/ApproveByPassword';

// Initialize Firebase
const firebase = initializeApp(firebaseConfig);
const database = getDatabase(firebase);

// Types
interface DrinkData {
  date: string;
  data: Record<string, number> | null;
}

interface TotalIngredients {
  [ingredient: string]: number;
}

// Styled Components
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  margin: theme.spacing(2, 0),
  backgroundColor: theme.palette.background.default,
}));

const HeaderBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4, 0),
  marginBottom: theme.spacing(4),
}));

const StyledListItem = styled(ListItem)<{ itemtype: 'RW' | 'CW' }>(({ theme, itemtype }) => ({
  backgroundColor: itemtype === 'RW' ? theme.palette.primary.light : theme.palette.success.light,
  marginBottom: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
}));

// Helper Functions
const formatDate = (date: Date): string => {
  const day = date.toLocaleDateString('uk-UA', { day: '2-digit' });
  const month = date.toLocaleDateString('uk-UA', { month: '2-digit' });
  return `${day}-${month} НАПОЇ`;
};

const calculateTotalIngredients = (data: Record<string, number> | null): TotalIngredients => {
  if (!data) return {};

  return Object.entries(data).reduce((acc: TotalIngredients, [itemName, quantity]) => {
    const itemIngredients = convertingValues[itemName];
    if (!itemIngredients) return acc;

    Object.entries(itemIngredients).forEach(([ingredient, amount]) => {
      acc[ingredient] = (acc[ingredient] || 0) + amount * quantity;
    });

    return acc;
  }, {});
};

const TabPanel: React.FC<{
  value: number;
  index: number;
  children: React.ReactNode;
  data?: Record<string, number> | null;
}> = ({ children, value, index, data }) => {
  const totalIngredients = data ? calculateTotalIngredients(data) : {};

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`drinks-tabpanel-${index}`}
      aria-labelledby={`drinks-tab-${index}`}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
          {Object.keys(totalIngredients).length > 0 && (
            <>
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                Total Ingredients
              </Typography>
              <List>
                {Object.entries(totalIngredients).map(([ingredient, amount]) => {
                  const unit = convertingFixing[ingredient] ? Object.keys(convertingFixing[ingredient])[0] : '';
                  const convertedAmount = convertingFixing[ingredient]
                    ? amount / convertingFixing[ingredient][unit]
                    : amount;

                  return (
                    <ListItem key={ingredient}>
                      <ListItemText
                        primary={`${ingredient}: ${convertedAmount.toFixed(2)} ${unit}`}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </>
          )}
        </Box>
      )}
    </div>
  );
};

// Data Loading Functions
const loadPreviousDaysData = async (): Promise<DrinkData[]> => {
  try {
    const currentDate = new Date();
    const dates = Array.from({ length: 3 }, (_, i) => {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);
      return formatDate(date);
    });

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

const loadWeekData = async (startDate: Date, endDate: Date): Promise<DrinkData[]> => {
  try {
    const dates = [];
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      dates.push(formatDate(date));
    }

    return await Promise.all(
      dates.map(async (date) => {
        const snapshot = await get(child(ref(database), `wasteItems/${date}`));
        return {
          date,
          data: snapshot.exists() ? snapshot.val() : null,
        };
      })
    );
  } catch (error) {
    console.error('Error loading week data:', error);
    return [];
  }
};

const getWeekDates = (offsetWeeks: number = 0): { start: Date; end: Date } => {
  const current = new Date();
  const start = new Date(current.setDate(current.getDate() - current.getDay() + 1 + (offsetWeeks * 7)));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
};

const Drinks: React.FC = () => {
  const [previousDaysData, setPreviousDaysData] = useState<DrinkData[]>([]);
  const [currentWeekData, setCurrentWeekData] = useState<DrinkData[]>([]);
  const [previousWeekData, setPreviousWeekData] = useState<DrinkData[]>([]);
  const [tabIndex, setTabIndex] = useState(0);
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

  const handleLoadWeekData = async (isPrevious: boolean = false) => {
    try {
      setLoading(true);
      const { start, end } = getWeekDates(isPrevious ? -1 : 0);
      const data = await loadWeekData(start, end);

      if (isPrevious) {
        setPreviousWeekData(data);
      } else {
        setCurrentWeekData(data);
      }
    } catch (err) {
      setError(`Failed to load ${isPrevious ? 'previous' : 'current'} week data.`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !previousDaysData.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <HeaderBox>
        <Typography variant="h4" component="h1" gutterBottom>
          Історія персональних напоїв
        </Typography>
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
          <Tab label="Поточний тиждень" />
          <Tab label="Попередній тиждень" />
        </Tabs>

        {/* Daily Data Tabs */}
        {previousDaysData.map(({ date, data }, index) => (
          <TabPanel key={date} value={tabIndex} index={index} data={data}>
            <List>
              {data ? (
                Object.entries(data).map(([itemName, quantity]) => (
                  <StyledListItem
                    key={itemName}
                    itemtype={itemName.includes('RW') ? 'RW' : 'CW'}
                  >
                    <ListItemText primary={`${itemName}: ${quantity}`} />
                  </StyledListItem>
                ))
              ) : (
                <Alert severity="warning">Відсутні дані за обраний період</Alert>
              )}
            </List>
          </TabPanel>
        ))}

        {/* Current Week Tab */}
        <TabPanel value={tabIndex} index={previousDaysData.length}>
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              onClick={() => handleLoadWeekData(false)}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Завантажити дані за поточний тиждень'}
            </Button>
          </Box>

          {currentWeekData.map(({ date, data }) => (
            <Box key={date} sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                {date}
              </Typography>
              <List>
                {data ? (
                  Object.entries(data).map(([itemName, quantity]) => (
                    <StyledListItem
                      key={itemName}
                      itemtype={itemName.includes('RW') ? 'RW' : 'CW'}
                    >
                      <ListItemText primary={`${itemName}: ${quantity}`} />
                    </StyledListItem>
                  ))
                ) : (
                  <Alert severity="warning">Відсутні дані за обраний період</Alert>
                )}
              </List>
              <Divider sx={{ mt: 2 }} />
            </Box>
          ))}
        </TabPanel>

        {/* Previous Week Tab */}
        <TabPanel value={tabIndex} index={previousDaysData.length + 1}>
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              onClick={() => handleLoadWeekData(true)}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Завантажити дані за попередній тиждень'}
            </Button>
          </Box>

          {previousWeekData.map(({ date, data }) => (
            <Box key={date} sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                {date}
              </Typography>
              <List>
                {data ? (
                  Object.entries(data).map(([itemName, quantity]) => (
                    <StyledListItem
                      key={itemName}
                      itemtype={itemName.includes('RW') ? 'RW' : 'CW'}
                    >
                      <ListItemText primary={`${itemName}: ${quantity}`} />
                    </StyledListItem>
                  ))
                ) : (
                  <Alert severity="warning">Відсутні дані за обраний період</Alert>
                )}
              </List>
              <Divider sx={{ mt: 2 }} />
            </Box>
          ))}
        </TabPanel>
      </StyledPaper>
    </Container>
  );
};

export default ApproveByPassword(Drinks);