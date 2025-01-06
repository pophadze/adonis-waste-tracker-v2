import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Container,
    Grid,
    Paper,
    Typography,
    IconButton,
    Card,
    CardContent,
    CardMedia,
    Snackbar,
    Alert,
    Switch,
    FormControlLabel,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import BackspaceIcon from '@mui/icons-material/Backspace';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import { CATEGORIES, GOOGLE_API_KEY, GOOGLE_SHEET_ID, GOOGLE_SHEET_SELECTION_RANGE, NUMERIC_KEYS } from '../../static-data/constants';
import { saveWasteItemToFirebase } from '../../firebase/firabase';
import { WasteItem } from '../../types/types';
import { fetchCategoriesData } from '../../utils/fetchCategoriesData';

const WasteItemCard = styled(Card)(({ theme }) => ({
    width: '100%',
    height: '120px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(1),
    position: 'relative',
    marginBottom: theme.spacing(1),
}));

const AmountBadge = styled(Box)(({ theme }) => ({
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    backgroundColor: theme.palette.primary.main,
    color: 'white',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
}));

const StyledNumericButton = styled(Button)(({ theme }) => ({
    height: '0', // Set to 0 to use padding for aspect ratio
    width: '0', // Set to 0 to use padding for aspect ratio
    margin: theme.spacing(0.5),
    borderRadius: '7px',
    fontSize: '1.25rem',
    display: 'flex', // Center content inside the button
    justifyContent: 'center',
    alignItems: 'center',
}))

const StyledCategoryCard = styled(Card, {
    shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ theme, active }) => ({
    cursor: 'pointer',
    marginTop: '5px',
    transition: 'all 0.2s ease-in-out',
    transform: active ? 'scale(1.05)' : 'scale(1)',
    border: active ? `2px solid ${theme.palette.primary.main}` : 'none',
    outline: 'none',
    height: '145px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    boxShadow: 'none',
    filter: active ? '' : 'grayscale(60%)',
    '&:hover': {
        transform: 'scale(1.05)',
    },
    background: 'transparent'
}));

const StyledDivider = styled('div')(({ theme }) => ({
    width: '100%',
    height: '1px',  // Thickness of the divider
    boxShadow: `0px 2px 5px 0px ${theme.palette.primary.main}`,  // Increased blur and spread
    marginTop: '6px',
    marginBottom: '15px',
    backgroundColor: 'transparent',  // Ensure it's transparent since we use shadow
}));



const ContentContainer = styled(Box)({
    maxWidth: '980px',
    margin: '0 auto',
    width: '100%',
});

const HomePage = () => {
    const [selectedAmount, setSelectedAmount] = useState<string>('');
    const [wasteList, setWasteList] = useState<WasteItem[]>([]);
    const [menuItems, setMenuItems] = useState<any[][] | null>([]);
    const [selectedCategory, setSelectedCategory] = useState<number>(0);
    const [showSnackbar, setShowSnackbar] = useState<boolean>(false);
    const [snackbarMessage, setSnackbarMessage] = useState<string>('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
    const [showIconView, setShowIconView] = useState(() => {
        const storedValue = localStorage.getItem('wasteListIconView');
        return storedValue === null ? true : storedValue === 'true';
    });

    useEffect(() => {
        localStorage.setItem('wasteListIconView', showIconView.toString());
    }, [showIconView]);

    const handleCategoryChange = (categoryId: number) => {
        if (selectedCategory === 6 || categoryId === 6) {
            setSelectedAmount('');
        }

        setSelectedCategory(categoryId);
    };

    useEffect(() => {
        fetchCategoriesData(CATEGORIES, GOOGLE_SHEET_SELECTION_RANGE, GOOGLE_SHEET_ID, GOOGLE_API_KEY)
            .then((res: [][] | null) => {
                setMenuItems(res);
                console.log(res);
            })
            .catch(err => console.log(err));
    }, []);

    const showNotification = (message: string, severity: 'success' | 'error') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setShowSnackbar(true);
    };

    const handleNumericInput = (value: string) => {
        if (selectedCategory === 6 && value === '.' && !selectedAmount.includes('.')) {
            setSelectedAmount(prev => prev + value);
        } else if (value !== '.') {
            setSelectedAmount(prev => prev + value);
        }
    };

    const handleAddToList = (product: string, selectedCategory: number) => {
        const amount = selectedAmount === '' ? 1 : parseFloat(selectedAmount);
        const modifiedProduct = selectedCategory === 6 ? `RW-${product}` : product;
        const category = selectedCategory === 4 ? 'Напої' : null;

        setWasteList(prev => {
            const existingItem = prev.find(item => item.product === modifiedProduct);
            if (existingItem) {
                return prev.map(item =>
                    item.product === modifiedProduct
                        ? { ...item, amount: item.amount + amount, category }
                        : item
                );
            }
            return [...prev, { product: modifiedProduct, amount, category }];
        });

        setSelectedAmount('');
    };

    const handleSaveToDatabase = async () => {
        //setIsSaving(true);

        if (wasteList.length === 0) {
            showNotification('Немає елементів для збереження', 'error');
            //setIsSaving(false);
            return;
        }

        try {
            const currentDate = new Date();
            const currentDay = currentDate
                .toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })
                .replace(/\./g, '-');
            const currentHour = currentDate.getHours();
            let sufix: '1SH' | '2SH';

            if (currentHour < 14 || (currentHour === 14 && currentDate.getMinutes() < 30)) {
                sufix = '1SH';
            } else {
                sufix = '2SH';
            }

            const drinkSufix = 'НАПОЇ';

            let errorOccurred = false;

            const onlyWaste = wasteList.filter(wasteItem => wasteItem.category !== 'Напої');
            const onlyDrink = wasteList.filter(wasteItem => wasteItem.category === 'Напої')

            for (const wasteItem of onlyWaste) {
                try {
                    const result = `${currentDay} ${sufix}`;
                    await saveWasteItemToFirebase(result, { [wasteItem.product]: wasteItem.amount });
                    console.log(`Waste item "${wasteItem.product}" saved to Firebase successfully`);
                } catch (error) {
                    showNotification('Немає зєднання з Інтернетом. Перевірте підключення та спробуйте ще раз.', 'error');
                    errorOccurred = true;
                }
            }

            for (const drinkItem of onlyDrink) {
                try {
                    const result = `${currentDay} ${drinkSufix}`;
                    await saveWasteItemToFirebase(result, { [drinkItem.product]: drinkItem.amount });
                    console.log(`Waste item "${drinkItem.product}" saved to Firebase successfully`);
                } catch (error) {
                    showNotification('Немає зєднання з Інтернетом. Перевірте підключення та спробуйте ще раз.', 'error');
                    errorOccurred = true;
                }
            }

            setWasteList([]);
            if (!errorOccurred) {
                showNotification('Дані збережені успішно', 'success');
            }
        } catch (error) {
            showNotification('Сталася помилка під час збереження даних', 'error');
        } finally {
            //setIsSaving(false);
        }
    };

    const getItemImage = (product: string) => {
        const category = CATEGORIES.find(cat =>
            menuItems && menuItems[cat.id]?.some(item =>
                item[0] === (product.startsWith('RW-') ? product.slice(3) : product)
            )
        );

        if (category) {
            const menuItem = menuItems && menuItems[category.id]?.find(item =>
                item[0] === (product.startsWith('RW-') ? product.slice(3) : product)
            );
            return menuItem ? menuItem[1] : category.imageUrl;
        }
        return '';
    };

    const WasteListContent = () => {
        if (showIconView) {
            return (
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: 2,
                    height: '145px',
                    overflowY: 'auto'
                }}>
                    {Array.from({ length: 10 }).map((_, colIndex) => (
                        <Box key={colIndex} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {wasteList
                                .filter((_, index) => index % 5 === colIndex)
                                .map((item, index) => (
                                    <WasteItemCard key={index}>
                                        <CardMedia
                                            component="img"
                                            image={getItemImage(item.product)}
                                            alt={item.product}
                                            sx={{
                                                position: 'absolute', // Position absolutely to cover the square
                                                top: '0px', // Start from the top
                                                left: 0,
                                                right: 0,
                                                objectFit: 'cover', // Maintain aspect ratio while covering the area
                                            }}
                                        />
                                        <CardContent
                                            sx={{
                                                position: 'absolute', // Position content absolutely
                                                top: 0, // Align to the bottom
                                                left: 0,
                                                right: 0,
                                                height: '2.7rem',
                                                background: 'rgba(255, 255, 255, 0.7)', // Semi-transparent background
                                                padding: '5px', // Optional: add some padding
                                            }}
                                        >
                                            <Typography variant="body1" align="center" sx={{ lineHeight: '1.1rem' }}>
                                                {item.product}
                                            </Typography>
                                        </CardContent>
                                        <AmountBadge>
                                            {item.amount}
                                        </AmountBadge>
                                    </WasteItemCard>
                                ))}
                        </Box>
                    ))}
                </Box>
            );
        }

        return (
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 1,
                }}
            >
                {wasteList.map((item, index) => (
                    <Box
                        key={index}
                        sx={{
                            p: 1,
                            backgroundColor: 'background.paper',
                            borderRadius: 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            width: '100%',
                        }}
                    >
                        <Typography>{item.product}</Typography>
                        <Typography fontWeight="bold">{item.amount}</Typography>
                    </Box>
                ))}
            </Box>
        );
    };


    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <ContentContainer>
                {/* Top Section - Amount Display and Product List */}

                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={3}>
                        <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                            <Typography variant="h6" gutterBottom>
                                Вибрана кількість
                            </Typography>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Typography variant="h4">{selectedAmount || '0'}</Typography>
                                <IconButton
                                    onClick={() => setSelectedAmount('')}
                                    color="primary"
                                >
                                    <BackspaceIcon />
                                </IconButton>
                            </Box>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={9}>
                        <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                            {wasteList.length > 0 ? (
                                <>
                                    <Box
                                        display="flex"
                                        justifyContent="space-between"
                                        alignItems="center"
                                        mb={2}
                                        flexWrap={{ xs: 'wrap', sm: 'nowrap' }} // Allows wrapping on small screens
                                    >
                                        <Typography variant="h6" sx={{ mb: { xs: 1, sm: 0 } }}>Список списання</Typography>

                                        <Box
                                            display="flex"
                                            alignItems="center"
                                            flexDirection={{ xs: 'column', sm: 'row' }} // Stack vertically on mobile
                                            sx={{ gap: { xs: 1, sm: 0 }, width: '100%', justifyContent: 'flex-end' }} // Add gap and make full width for mobile
                                        >
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={showIconView}
                                                        onChange={(e) => setShowIconView(e.target.checked)}
                                                    />
                                                }
                                                label={"Зображення"}
                                                sx={{ mr: { xs: 0, sm: 2 }, mb: { xs: 1, sm: 0 } }} // Adjust margin for mobile
                                            />
                                            <Button
                                                startIcon={<DeleteOutlineIcon />}
                                                onClick={() => setWasteList([])}
                                                color="error"
                                                variant="outlined"
                                                sx={{ mr: { xs: 0, sm: 1 }, mb: { xs: 1, sm: 0 }, width: { xs: '100%', sm: 'auto' } }} // Full width on mobile
                                            >
                                                Очистити
                                            </Button>
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                startIcon={<SaveIcon />}
                                                onClick={handleSaveToDatabase}
                                                sx={{ width: { xs: '100%', sm: 'auto' } }} // Full width on mobile
                                            >
                                                Зберегти
                                            </Button>
                                        </Box>
                                    </Box>

                                    <WasteListContent />
                                </>
                            ) : (
                                <Typography variant="body1" textAlign="center">
                                    Список порожній
                                </Typography>
                            )}
                        </Paper>
                    </Grid>
                </Grid>

                <Box
                    display="flex"
                    flexWrap="wrap" // Allow wrapping for smaller screens
                    justifyContent={{ xs: 'center', sm: 'space-between', md: 'space-between' }} // Center items on small screens, left-align on medium and up
                    sx={{
                        maxWidth: '980px',
                        margin: '0 auto', // Center the Box within the parent
                        padding: 1,
                    }}
                >
                    {NUMERIC_KEYS.map((key, index) => (
                        <>
                            <Box
                                key={key} // Add a key for each Box
                                display="flex"
                                justifyContent="center" // Center the button within its Box
                                sx={{
                                    width: {
                                        xs: 'calc(25% - 16px)', // 4 buttons per row on 300-499 px
                                        sm: 'calc(9% - 16px)', // 3 buttons per row on 500-799 px
                                        md: 'calc(9% - 16px)', // 5 buttons per row on 800+ px
                                    },
                                    padding: 1,
                                }}
                            >
                                <StyledNumericButton
                                    variant="contained"
                                    onClick={() => handleNumericInput(key)}
                                    sx={{
                                        padding: {
                                            xs: '30%', // 4 buttons per row on 300-499 px
                                            sm: '100%', // 3 buttons per row on 500-799 px
                                            md: '70%', // 5 buttons per row on 800+ px
                                        }
                                    }}
                                >
                                    {key}
                                </StyledNumericButton>
                            </Box>
                            {index === (NUMERIC_KEYS.length - 1) && selectedCategory === 6 && (
                                <Box
                                    key={key} // Add a key for each Box
                                    display="flex"
                                    justifyContent="center" // Center the button within its Box
                                    sx={{
                                        width: {
                                            xs: 'calc(25% - 16px)', // 4 buttons per row on 300-499 px
                                            sm: 'calc(9% - 16px)', // 3 buttons per row on 500-799 px
                                            md: 'calc(9% - 16px)', // 5 buttons per row on 800+ px
                                        },
                                        padding: 1,
                                    }}
                                >
                                    <StyledNumericButton
                                        variant="contained"
                                        onClick={() => handleNumericInput('.')}
                                        sx={{
                                            padding: {
                                                xs: '30%', // 4 buttons per row on 300-499 px
                                                sm: '100%', // 3 buttons per row on 500-799 px
                                                md: '70%', // 5 buttons per row on 800+ px
                                            }
                                        }}
                                    >
                                        .
                                    </StyledNumericButton>
                                </Box>
                            )}
                        </>

                    ))}
                </Box>

                <StyledDivider />

                {/* Categories - Single Row */}
                <Box sx={{ mb: 1 }}>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',  // 7 equal columns
                            gap: 2,  // spacing between grid items
                        }}
                    >
                        {CATEGORIES.map((category) => (
                            <StyledCategoryCard
                                key={category.id}
                                active={selectedCategory === category.id}
                                onClick={() => handleCategoryChange(category.id)}
                            >
                                <CardContent sx={{ p: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <CardMedia
                                        component="img"
                                        height="100"
                                        image={category.imageUrl}
                                        alt={category.name}
                                    />
                                    <Typography variant="body2" align="center">
                                        {category.name}
                                    </Typography>
                                </CardContent>
                            </StyledCategoryCard>
                        ))}
                    </Box>
                </Box>

                <StyledDivider />



                {/* Products Grid - Up to 7 items per row */}
                {menuItems && menuItems[selectedCategory]?.length > 0 && (
                    <Box display="flex" flexWrap="wrap" justifyContent="center">
                        {menuItems && menuItems[selectedCategory].map((item, index) => (
                            <Box
                                key={index}
                                flexBasis={{ xs: '50%', sm: '16.666%', md: '16.666%' }} // Updated tablet size to show 6 items
                                display="flex"
                                justifyContent="center"
                                alignItems="flex-start"
                                sx={{ padding: 1 }}
                            >
                                <Card
                                    onClick={() => handleAddToList(item[0], selectedCategory)}
                                    sx={{
                                        cursor: 'pointer',
                                        '&:hover': { transform: 'scale(1.02)' },
                                        transition: 'transform 0.2s',
                                        width: '100%',
                                        height: 0,
                                        paddingBottom: '100%',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <CardMedia
                                        component="img"
                                        image={item[1]}
                                        alt={item[0]}
                                        sx={{
                                            position: 'absolute',
                                            top: '0px',
                                            left: 0,
                                            right: 0,
                                            height: '100%',
                                            width: '100%',
                                            objectFit: 'cover',
                                        }}
                                    />
                                    <CardContent
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: '2.7rem',
                                            background: 'rgba(255, 255, 255, 0.7)',
                                            padding: '5px',
                                        }}
                                    >
                                        <Typography variant="body1" align="center" sx={{ lineHeight: '1.1rem' }}>
                                            {item[0]}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Box>
                        ))}
                    </Box>
                )}



            </ContentContainer>

            <Snackbar
                open={showSnackbar}
                autoHideDuration={5000}
                onClose={() => setShowSnackbar(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setShowSnackbar(false)}
                    severity={snackbarSeverity}
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default HomePage;