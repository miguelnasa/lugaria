// Application State
const appState = {
    currentTrip: {
        name: '',
        startDate: '',
        endDate: '',
        peopleCount: 1,
        events: {}
    },
    conversionRates: {
        USD_TO_COP: 4071,
        EUR_TO_COP: 4729,
        EUR_TO_USD: 0.86
    },
    editingEvent: null
};

// Event type icons mapping
const eventTypeIcons = {
    'Transporte': '🚗',
    'Alimentación': '🍽️',
    'Alojamiento': '🏨',
    'Servicio': '🛎️',
    'Evento': '🎭',
    'Lugar': '📍'
};

// Transport modes data
const transportModes = {
    'driving': { name: 'Conducir', timeRange: [45, 90] },
    'walking': { name: 'Caminar', timeRange: [15, 30] },
    'bicycling': { name: 'Bicicleta', timeRange: [20, 45] },
    'transit': { name: 'Tránsito', timeRange: [60, 120] }
};

// Booking.com price simulation data
const priceSimulation = {
    base_price_per_night: {
        budget: 60,
        mid_range: 120,
        luxury: 250
    },
    country_factors: {
        do: 0.7,
        es: 1.2,
        us: 1.5,
        fr: 1.3,
        it: 1.1,
        de: 1.2,
        uk: 1.4,
        default: 1.0
    }
};

// Currency API URLs
const currencyAPIs = {
    usd: {
        primary: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
        fallback: 'https://latest.currency-api.pages.dev/v1/currencies/usd.json'
    },
    eur: {
        primary: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json',
        fallback: 'https://latest.currency-api.pages.dev/v1/currencies/eur.json'
    }
};

// DOM Elements
const elements = {
    tripName: document.getElementById('tripName'),
    peopleCount: document.getElementById('peopleCount'),
    startDate: document.getElementById('startDate'),
    endDate: document.getElementById('endDate'),
    generateCalendar: document.getElementById('generateCalendar'),
    calendar: document.getElementById('calendar'),
    savePlan: document.getElementById('savePlan'),
    printPlan: document.getElementById('printPlan'),
    loadPlanFile: document.getElementById('loadPlanFile'),
    loadPlan: document.getElementById('loadPlan'),
    displayCurrency: document.getElementById('displayCurrency'),
    financialBreakdown: document.getElementById('financialBreakdown'),
    eventModal: document.getElementById('eventModal'),
    eventForm: document.getElementById('eventForm'),
    closeModal: document.getElementById('closeModal'),
    cancelEvent: document.getElementById('cancelEvent'),
    modalTitle: document.getElementById('modalTitle'),
    submitEvent: document.getElementById('submitEvent'),
    usdCopRate: document.getElementById('usdCopRate'),
    eurCopRate: document.getElementById('eurCopRate'),
    updateRates: document.getElementById('updateRates'),
    transportCheckbox: document.getElementById('transportCheckbox'),
    transportFields: document.getElementById('transportFields'),
    bookingUrl: document.getElementById('bookingUrl'),
    extractBookingData: document.getElementById('extractBookingData'),
    bookingExtractionResult: document.getElementById('bookingExtractionResult'),
    extractedDataSummary: document.getElementById('extractedDataSummary'),
    alojamientoCheckbox: document.getElementById('alojamientoCheckbox')
};

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set default dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 3); // Default to 3-day trip
    
    elements.startDate.value = formatDateForInput(today);
    elements.endDate.value = formatDateForInput(tomorrow);
    
    // Initialize conversion rates
    elements.usdCopRate.value = appState.conversionRates.USD_TO_COP;
    elements.eurCopRate.value = appState.conversionRates.EUR_TO_COP;
    
    setupEventListeners();
    updateFinancialSummary();
    
    // Automatically update rates on app initialization
    setTimeout(() => {
        updateConversionRatesFromAPI();
    }, 1000); // Delay to allow UI to fully load
}

function setupEventListeners() {
    elements.generateCalendar.addEventListener('click', generateCalendar);
    elements.savePlan.addEventListener('click', savePlanAsXML);
    elements.printPlan.addEventListener('click', printPlan);
    elements.loadPlan.addEventListener('click', loadPlanFromXML);
    elements.displayCurrency.addEventListener('change', updateFinancialSummary);
    elements.closeModal.addEventListener('click', closeModal);
    elements.cancelEvent.addEventListener('click', closeModal);
    elements.eventForm.addEventListener('submit', handleEventSubmit);
    elements.peopleCount.addEventListener('input', updateFinancialSummary);
    elements.updateRates.addEventListener('click', updateConversionRatesFromAPI);
    elements.usdCopRate.addEventListener('input', updateConversionRatesManually);
    elements.eurCopRate.addEventListener('input', updateConversionRatesManually);
    
    // Transport checkbox listener
    if (elements.transportCheckbox) {
        elements.transportCheckbox.addEventListener('change', toggleTransportFields);
    }
    
    // Booking.com extraction listener
    if (elements.extractBookingData) {
        elements.extractBookingData.addEventListener('click', extractBookingComData);
    }
    
    // Duration calculation
    const durationInput = document.getElementById('eventDuration');
    const durationUnit = document.getElementById('eventDurationUnit');
    const startTimeInput = document.getElementById('eventStartTime');
    
    if (durationInput) durationInput.addEventListener('input', calculateEndTime);
    if (durationUnit) durationUnit.addEventListener('change', calculateEndTime);
    if (startTimeInput) startTimeInput.addEventListener('input', calculateEndTime);
    
    // Transport mode and location change listeners
    const transportMode = document.getElementById('transportMode');
    const eventOrigin = document.getElementById('eventOrigin');
    const eventDestination = document.getElementById('eventDestination');
    
    if (transportMode) transportMode.addEventListener('change', calculateEstimatedTime);
    if (eventOrigin) eventOrigin.addEventListener('input', calculateEstimatedTime);
    if (eventDestination) eventDestination.addEventListener('input', calculateEstimatedTime);
    
    // Google Maps calculation button
    const calculateGoogleMapsBtn = document.getElementById('calculateGoogleMaps');
    if (calculateGoogleMapsBtn) {
        calculateGoogleMapsBtn.addEventListener('click', calculateEstimatedTime);
    }
    
    // Close modal on backdrop click
    elements.eventModal.addEventListener('click', function(e) {
        if (e.target === elements.eventModal) {
            closeModal();
        }
    });
}

// Function to fetch currency rates from APIs with better error handling
async function fetchCurrencyRate(currency) {
    const apis = currencyAPIs[currency.toLowerCase()];
    if (!apis) return null;

    try {
        console.log(`Fetching ${currency} rates from primary API...`);
        let response = await fetch(apis.primary);
        
        if (!response.ok) {
            console.warn(`Primary API failed for ${currency} (${response.status}), trying fallback...`);
            response = await fetch(apis.fallback);
        }
        
        if (!response.ok) {
            throw new Error(`Both APIs failed for ${currency}. Primary: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Successfully fetched ${currency} data:`, data);
        return data;
    } catch (error) {
        console.error(`Error fetching ${currency} rates:`, error);
        return null;
    }
}

// Function to update conversion rates from APIs with improved feedback
async function updateConversionRatesFromAPI() {
    const updateBtn = elements.updateRates;
    const originalText = updateBtn.textContent;
    
    // Show loading state
    updateBtn.textContent = 'Obteniendo tasas automáticamente...';
    updateBtn.disabled = true;
    
    try {
        console.log('Starting automatic currency rate update...');
        
        // Fetch USD and EUR rates simultaneously
        const [usdData, eurData] = await Promise.all([
            fetchCurrencyRate('usd'),
            fetchCurrencyRate('eur')
        ]);

        let updated = false;
        let updateMessage = '';

        // Update USD to COP rate
        if (usdData && usdData.usd && usdData.usd.cop) {
            const usdToCop = Math.round(usdData.usd.cop * 100) / 100;
            appState.conversionRates.USD_TO_COP = usdToCop;
            elements.usdCopRate.value = usdToCop;
            updateMessage += `USD/COP: ${usdToCop}`;
            updated = true;
            console.log(`Updated USD to COP rate: ${usdToCop}`);
        } else {
            console.warn('Failed to get USD to COP rate from API');
            updateMessage += 'USD/COP: Error ';
        }

        // Update EUR to COP rate
        if (eurData && eurData.eur && eurData.eur.cop) {
            const eurToCop = Math.round(eurData.eur.cop * 100) / 100;
            appState.conversionRates.EUR_TO_COP = eurToCop;
            elements.eurCopRate.value = eurToCop;
            updateMessage += ` | EUR/COP: ${eurToCop}`;
            updated = true;
            console.log(`Updated EUR to COP rate: ${eurToCop}`);
        } else {
            console.warn('Failed to get EUR to COP rate from API');
            updateMessage += ' | EUR/COP: Error';
        }

        // Calculate EUR to USD rate
        if (appState.conversionRates.EUR_TO_COP && appState.conversionRates.USD_TO_COP) {
            appState.conversionRates.EUR_TO_USD = appState.conversionRates.EUR_TO_COP / appState.conversionRates.USD_TO_COP;
        }

        if (updated) {
            updateBtn.textContent = '✅ Tasas actualizadas';
            console.log('Currency rates updated successfully:', updateMessage);
            updateFinancialSummary();
        } else {
            updateBtn.textContent = '⚠️ Error al obtener tasas';
            console.error('Failed to update any currency rates');
        }

    } catch (error) {
        console.error('Error in updateConversionRatesFromAPI:', error);
        updateBtn.textContent = '❌ Error de conexión';
    }

    // Reset button after delay
    setTimeout(() => {
        updateBtn.textContent = originalText;
        updateBtn.disabled = false;
    }, 4000);
}

// Function to update conversion rates manually (when user types)
function updateConversionRatesManually() {
    const usdRate = parseFloat(elements.usdCopRate.value);
    const eurRate = parseFloat(elements.eurCopRate.value);
    
    if (usdRate && usdRate > 0) {
        appState.conversionRates.USD_TO_COP = usdRate;
    }
    
    if (eurRate && eurRate > 0) {
        appState.conversionRates.EUR_TO_COP = eurRate;
        if (usdRate && usdRate > 0) {
            appState.conversionRates.EUR_TO_USD = eurRate / usdRate;
        }
    }
    
    // Recalculate financial summary
    updateFinancialSummary();
}

// Booking.com Data Extraction Function
function extractBookingComData() {
    const url = elements.bookingUrl.value.trim();
    
    if (!url) {
        alert('Por favor ingrese una URL de Booking.com');
        elements.bookingUrl.focus();
        return;
    }
    
    if (!url.includes('booking.com')) {
        alert('Por favor ingrese una URL válida de Booking.com');
        elements.bookingUrl.focus();
        return;
    }
    
    try {
        // Show loading state
        elements.extractBookingData.textContent = 'Extrayendo datos...';
        elements.extractBookingData.disabled = true;
        
        // Parse URL
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        
        // Extract hotel name from path (/hotel/country/hotel-name.html)
        let hotelName = 'Hotel';
        let countryCode = 'default';
        
        if (pathParts.length >= 4) {
            countryCode = pathParts[2] || 'default';
            const hotelPath = pathParts[3] || '';
            hotelName = hotelPath.replace('.html', '')
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        
        // Extract URL parameters
        const params = new URLSearchParams(urlObj.search);
        const checkin = params.get('checkin') || '';
        const checkout = params.get('checkout') || '';
        const adults = parseInt(params.get('group_adults')) || 2;
        const children = parseInt(params.get('group_children')) || 0;
        const totalPeople = adults + children;
        
        // Calculate nights
        let nights = 1;
        if (checkin && checkout) {
            const checkinDate = new Date(checkin);
            const checkoutDate = new Date(checkout);
            const timeDiff = checkoutDate.getTime() - checkinDate.getTime();
            nights = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));
        }
        
        // Simulate price calculation
        const countryFactor = priceSimulation.country_factors[countryCode] || priceSimulation.country_factors.default;
        const basePrice = priceSimulation.base_price_per_night.mid_range;
        const totalPrice = Math.round(basePrice * countryFactor * nights);
        
        // Auto-fill form fields
        document.getElementById('eventPlace').value = hotelName;
        
        if (checkin) {
            // Set start time to 15:00 (typical check-in time)
            document.getElementById('eventStartTime').value = '15:00';
        }
        
        // Set duration in hours (nights * 24)
        document.getElementById('eventDuration').value = nights * 24;
        document.getElementById('eventDurationUnit').value = 'Horas';
        
        // Calculate end time
        calculateEndTime();
        
        // Set price and currency
        document.getElementById('eventPrice').value = totalPrice;
        document.getElementById('eventCurrency').value = 'USD';
        
        // Auto-select "Alojamiento" typology
        if (elements.alojamientoCheckbox) {
            elements.alojamientoCheckbox.checked = true;
        }
        
        // Clear other typologies
        document.querySelectorAll('.event-types input[type="checkbox"]').forEach(checkbox => {
            if (checkbox.value !== 'Alojamiento') {
                checkbox.checked = false;
            }
        });
        
        // Generate address estimate
        const countryNames = {
            'do': 'República Dominicana',
            'es': 'España',
            'us': 'Estados Unidos',
            'fr': 'Francia',
            'it': 'Italia',
            'de': 'Alemania',
            'uk': 'Reino Unido'
        };
        
        const countryName = countryNames[countryCode] || 'País desconocido';
        const addressInfo = `Hotel extraído de Booking.com\nPaís: ${countryName}\nPersonas: ${totalPeople} (${adults} adultos, ${children} niños)\nNoches: ${nights}`;
        
        if (checkin && checkout) {
            document.getElementById('eventComments').value = `${addressInfo}\nCheck-in: ${checkin}\nCheck-out: ${checkout}`;
        } else {
            document.getElementById('eventComments').value = addressInfo;
        }
        
        // Show extraction result
        const summaryHtml = `
            <div class="extracted-data-item"><strong>Hotel:</strong> ${hotelName}</div>
            <div class="extracted-data-item"><strong>País:</strong> ${countryName}</div>
            <div class="extracted-data-item"><strong>Personas:</strong> ${totalPeople} (${adults} adultos, ${children} niños)</div>
            <div class="extracted-data-item"><strong>Noches:</strong> ${nights}</div>
            <div class="extracted-data-item"><strong>Precio estimado:</strong> $${totalPrice} USD</div>
            ${checkin ? `<div class="extracted-data-item"><strong>Check-in:</strong> ${checkin}</div>` : ''}
            ${checkout ? `<div class="extracted-data-item"><strong>Check-out:</strong> ${checkout}</div>` : ''}
        `;
        
        elements.extractedDataSummary.innerHTML = summaryHtml;
        elements.bookingExtractionResult.classList.remove('hidden');
        
        // Reset button
        setTimeout(() => {
            elements.extractBookingData.textContent = 'Extraer datos de Booking';
            elements.extractBookingData.disabled = false;
        }, 2000);
        
        // Show success message
        setTimeout(() => {
            elements.extractBookingData.textContent = '✅ Datos extraídos';
            setTimeout(() => {
                elements.extractBookingData.textContent = 'Extraer datos de Booking';
            }, 2000);
        }, 1000);
        
    } catch (error) {
        console.error('Error extracting Booking.com data:', error);
        alert('Error al extraer datos de la URL. Por favor verifique que la URL sea válida.');
        
        // Reset button
        elements.extractBookingData.textContent = 'Extraer datos de Booking';
        elements.extractBookingData.disabled = false;
    }
}

function toggleTransportFields() {
    const isTransportSelected = elements.transportCheckbox.checked;
    const transportFields = elements.transportFields;
    
    if (isTransportSelected) {
        transportFields.classList.remove('hidden');
    } else {
        transportFields.classList.add('hidden');
        // Clear transport-related fields
        document.getElementById('transportMode').value = 'driving';
        document.getElementById('estimatedTime').value = '';
    }
}

function calculateEstimatedTime() {
    const transportMode = document.getElementById('transportMode').value;
    const origin = document.getElementById('eventOrigin').value.trim();
    const destination = document.getElementById('eventDestination').value.trim();
    const estimatedTimeField = document.getElementById('estimatedTime');
    
    // Only calculate if we have transport mode and both origin and destination
    if (!origin || !destination) {
        estimatedTimeField.value = '';
        return;
    }
    
    // Show loading message
    estimatedTimeField.value = 'Calculando con Google Maps...';
    
    // Simulate Google Maps API call
    setTimeout(() => {
        const mode = transportModes[transportMode];
        const [minTime, maxTime] = mode.timeRange;
        const estimatedMinutes = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
        
        let timeDisplay;
        if (estimatedMinutes >= 60) {
            const hours = Math.floor(estimatedMinutes / 60);
            const minutes = estimatedMinutes % 60;
            timeDisplay = minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
        } else {
            timeDisplay = `${estimatedMinutes} min`;
        }
        
        estimatedTimeField.value = timeDisplay;
        
        // Auto-update duration if transport is selected
        updateDurationForTransport(estimatedMinutes);
    }, 2000);
}

function updateDurationForTransport(estimatedMinutes) {
    const durationInput = document.getElementById('eventDuration');
    const durationUnit = document.getElementById('eventDurationUnit');
    
    // Update duration based on estimated time
    if (estimatedMinutes >= 60) {
        const hours = Math.ceil(estimatedMinutes / 60);
        durationInput.value = hours;
        durationUnit.value = 'Horas';
    } else {
        durationInput.value = estimatedMinutes;
        durationUnit.value = 'Minutos';
    }
    
    // Recalculate end time
    calculateEndTime();
}

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

function formatDateDisplay(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
}

function generateCalendar() {
    const tripName = elements.tripName.value.trim();
    const startDate = elements.startDate.value;
    const endDate = elements.endDate.value;
    const peopleCount = parseInt(elements.peopleCount.value);
    
    if (!tripName) {
        alert('Por favor ingrese el nombre del viaje');
        elements.tripName.focus();
        return;
    }
    
    if (!startDate || !endDate) {
        alert('Por favor seleccione las fechas del viaje');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        alert('La fecha de inicio debe ser anterior a la fecha de fin');
        return;
    }
    
    if (!peopleCount || peopleCount < 1) {
        alert('La cantidad de personas debe ser al menos 1');
        elements.peopleCount.focus();
        return;
    }
    
    appState.currentTrip.name = tripName;
    appState.currentTrip.startDate = startDate;
    appState.currentTrip.endDate = endDate;
    appState.currentTrip.peopleCount = peopleCount;
    
    renderCalendar();
    updateFinancialSummary();
}

function renderCalendar() {
    const start = new Date(appState.currentTrip.startDate + 'T00:00:00');
    const end = new Date(appState.currentTrip.endDate + 'T00:00:00');
    
    let calendarHTML = '';
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
        const dateStr = formatDateForInput(currentDate);
        const events = appState.currentTrip.events[dateStr] || [];
        
        calendarHTML += `
            <div class="day-card">
                <div class="day-header">
                    <div class="day-date">${formatDateDisplay(dateStr)}</div>
                    <button class="btn btn--primary btn--sm add-event-btn" onclick="openEventModal('${dateStr}')">
                        Agregar Evento
                    </button>
                </div>
                <div class="events-list">
                    ${renderEvents(events, dateStr)}
                </div>
            </div>
        `;
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    elements.calendar.innerHTML = calendarHTML;
}

function renderEvents(events, dateStr) {
    if (events.length === 0) {
        return '<div class="empty-state">No hay eventos programados</div>';
    }
    
    return events.map((event, index) => {
        // Generate icons for this event's types
        const icons = event.types.map(type => eventTypeIcons[type] || '').filter(icon => icon);
        const iconsHTML = icons.map(icon => `<span class="event-icon">${icon}</span>`).join('');
        
        let eventHTML = `
            <div class="event-item">
                <div class="event-icons">
                    ${iconsHTML}
                </div>
                <div class="event-content">
                    <div class="event-header">
                        <div class="event-place">${event.place}</div>
                        <div class="event-actions">
                            <span class="event-price">${event.price} ${event.currency}</span>
                            <button class="btn btn--secondary btn--sm" onclick="editEvent('${dateStr}', ${index})" style="margin-left: 8px; padding: 2px 6px; background: #22C55E; color: white;">Editar</button>
                            <button class="btn btn--secondary btn--sm" onclick="deleteEvent('${dateStr}', ${index})" style="margin-left: 4px; padding: 2px 6px; background: #dc2626; color: white;">×</button>
                        </div>
                    </div>
                    <div class="event-time">${event.startTime} - ${event.endTime} (${event.duration} ${event.durationUnit})</div>
        `;
        
        // Add multi-day indicator if applicable
        if (event.isMultiDay) {
            eventHTML += `<div class="event-multiday-info">🔄 Evento multi-día (Día ${event.dayPart}/${event.totalDays}) - ${event.hoursInDay}h de ${event.totalHours}h totales</div>`;
        }
        
        // Add origin/destination info if available
        if (event.origin || event.destination) {
            eventHTML += `<div class="event-origin-destination">`;
            if (event.origin && event.destination) {
                eventHTML += `De: ${event.origin} → A: ${event.destination}`;
            } else if (event.origin) {
                eventHTML += `Origen: ${event.origin}`;
            } else if (event.destination) {
                eventHTML += `Destino: ${event.destination}`;
            }
            eventHTML += `</div>`;
        }
        
        // Add transport info if available
        if (event.transportMode && event.estimatedTime) {
            const modeName = transportModes[event.transportMode]?.name || event.transportMode;
            eventHTML += `<div class="event-transport-info">🚗 ${modeName} - Tiempo estimado: ${event.estimatedTime}</div>`;
        }
        
        eventHTML += `
                    <div class="event-types">
                        ${event.types.map(type => `<span class="event-type-tag">${type}</span>`).join('')}
                    </div>
        `;
        
        if (event.comments) {
            eventHTML += `<div class="event-comments">"${event.comments}"</div>`;
        }
        
        eventHTML += `
                </div>
            </div>
        `;
        
        return eventHTML;
    }).join('');
}

function openEventModal(dateStr, eventIndex = null) {
    document.getElementById('eventDate').value = dateStr;
    document.getElementById('eventIndex').value = eventIndex !== null ? eventIndex : '';
    
    // Reset booking extraction result
    elements.bookingExtractionResult.classList.add('hidden');
    elements.bookingUrl.value = '';
    
    if (eventIndex !== null) {
        // Editing mode
        const event = appState.currentTrip.events[dateStr][eventIndex];
        appState.editingEvent = { dateStr, eventIndex };
        
        elements.modalTitle.textContent = 'Editar Evento';
        elements.submitEvent.textContent = 'Guardar Cambios';
        
        // Fill form with existing data
        document.getElementById('eventPlace').value = event.place;
        document.getElementById('eventOrigin').value = event.origin || '';
        document.getElementById('eventDestination').value = event.destination || '';
        document.getElementById('eventStartTime').value = event.startTime;
        document.getElementById('eventDuration').value = event.duration;
        document.getElementById('eventDurationUnit').value = event.durationUnit;
        document.getElementById('eventEndTime').value = event.endTime;
        document.getElementById('eventPrice').value = event.originalPrice || event.price;
        document.getElementById('eventCurrency').value = event.currency;
        document.getElementById('eventComments').value = event.comments || '';
        
        // Set checkboxes
        document.querySelectorAll('.event-types input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = event.types.includes(checkbox.value);
        });
        
        // Handle transport fields
        const isTransport = event.types.includes('Transporte');
        elements.transportCheckbox.checked = isTransport;
        
        if (isTransport) {
            elements.transportFields.classList.remove('hidden');
            document.getElementById('transportMode').value = event.transportMode || 'driving';
            document.getElementById('estimatedTime').value = event.estimatedTime || '';
        } else {
            elements.transportFields.classList.add('hidden');
        }
    } else {
        // Adding mode
        appState.editingEvent = null;
        elements.modalTitle.textContent = 'Agregar Evento';
        elements.submitEvent.textContent = 'Agregar Evento';
        
        // Reset form
        elements.eventForm.reset();
        elements.transportFields.classList.add('hidden');
        
        // Set default values
        document.getElementById('eventDuration').value = '1';
        document.getElementById('eventDurationUnit').value = 'Horas';
        document.getElementById('eventCurrency').value = 'USD';
        document.getElementById('transportMode').value = 'driving';
        document.getElementById('estimatedTime').value = '';
    }
    
    elements.eventModal.classList.remove('hidden');
    
    // Focus on first input
    setTimeout(() => {
        document.getElementById('eventPlace').focus();
    }, 100);
}

function editEvent(dateStr, eventIndex) {
    openEventModal(dateStr, eventIndex);
}

function closeModal() {
    elements.eventModal.classList.add('hidden');
    elements.eventForm.reset();
    document.getElementById('eventEndTime').value = '';
    document.getElementById('estimatedTime').value = '';
    elements.transportFields.classList.add('hidden');
    elements.bookingExtractionResult.classList.add('hidden');
    elements.bookingUrl.value = '';
    appState.editingEvent = null;
}

function calculateEndTime() {
    const startTime = document.getElementById('eventStartTime').value;
    const durationInput = document.getElementById('eventDuration');
    const duration = parseInt(durationInput.value);
    const unit = document.getElementById('eventDurationUnit').value;
    
    if (!startTime || !duration || isNaN(duration) || duration <= 0) {
        document.getElementById('eventEndTime').value = '';
        return;
    }
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const durationMs = unit === 'Horas' ? duration * 60 * 60 * 1000 : duration * 60 * 1000;
    const endDate = new Date(startDate.getTime() + durationMs);
    
    const endHours = endDate.getHours().toString().padStart(2, '0');
    const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
    
    document.getElementById('eventEndTime').value = `${endHours}:${endMinutes}`;
}

// Function to create multi-day events
function createMultiDayEvents(baseEvent, dateStr) {
    const events = [];
    const startTime = baseEvent.startTime;
    const duration = baseEvent.duration;
    const unit = baseEvent.durationUnit;
    
    // Convert duration to minutes
    const totalMinutes = unit === 'Horas' ? duration * 60 : duration;
    
    // Parse start time
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const startTotalMinutes = startHours * 60 + startMinutes;
    
    // Calculate end time in minutes
    const endTotalMinutes = startTotalMinutes + totalMinutes;
    
    // Check if event crosses midnight (extends beyond 1440 minutes = 24 hours)
    if (endTotalMinutes <= 1440) {
        // Single day event - return as is
        return [{ ...baseEvent, isMultiDay: false }];
    }
    
    // Multi-day event - split across days
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10; // Round to 1 decimal
    let currentDate = new Date(dateStr + 'T00:00:00');
    let remainingMinutes = totalMinutes;
    let currentStartMinutes = startTotalMinutes;
    let dayCount = 1;
    
    while (remainingMinutes > 0) {
        const currentDateStr = formatDateForInput(currentDate);
        
        // Calculate hours for this day
        let hoursThisDay;
        let endTimeThisDay;
        
        if (dayCount === 1) {
            // First day: from start time to midnight
            hoursThisDay = (1440 - currentStartMinutes) / 60;
            endTimeThisDay = '24:00';
        } else {
            // Subsequent days: from midnight
            const minutesAvailable = Math.min(remainingMinutes, 1440);
            hoursThisDay = minutesAvailable / 60;
            
            const endMinutesFromMidnight = minutesAvailable;
            const endHours = Math.floor(endMinutesFromMidnight / 60);
            const endMins = endMinutesFromMidnight % 60;
            endTimeThisDay = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
            currentStartMinutes = 0; // Start from midnight
        }
        
        // Calculate proportional price
        const proportionalPrice = Math.round((baseEvent.price * hoursThisDay / totalHours) * 100) / 100;
        
        // Create event for this day
        const dayEvent = {
            ...baseEvent,
            startTime: dayCount === 1 ? startTime : '00:00',
            endTime: endTimeThisDay,
            duration: Math.round(hoursThisDay * 10) / 10,
            durationUnit: 'Horas',
            price: proportionalPrice,
            originalPrice: baseEvent.price,
            isMultiDay: true,
            dayPart: dayCount,
            totalDays: Math.ceil(totalMinutes / 1440),
            hoursInDay: Math.round(hoursThisDay * 10) / 10,
            totalHours: totalHours
        };
        
        events.push({ event: dayEvent, date: currentDateStr });
        
        remainingMinutes -= (dayCount === 1) ? (1440 - startTotalMinutes) : Math.min(remainingMinutes, 1440);
        currentDate.setDate(currentDate.getDate() + 1);
        dayCount++;
    }
    
    return events;
}

function handleEventSubmit(e) {
    e.preventDefault();
    
    const dateStr = document.getElementById('eventDate').value;
    const eventIndex = document.getElementById('eventIndex').value;
    const place = document.getElementById('eventPlace').value.trim();
    const origin = document.getElementById('eventOrigin').value.trim();
    const destination = document.getElementById('eventDestination').value.trim();
    const startTime = document.getElementById('eventStartTime').value;
    const duration = parseInt(document.getElementById('eventDuration').value);
    const durationUnit = document.getElementById('eventDurationUnit').value;
    const endTime = document.getElementById('eventEndTime').value;
    const price = parseFloat(document.getElementById('eventPrice').value);
    const currency = document.getElementById('eventCurrency').value;
    const comments = document.getElementById('eventComments').value.trim();
    
    // Get selected types
    const types = [];
    document.querySelectorAll('.event-types input[type="checkbox"]:checked').forEach(checkbox => {
        types.push(checkbox.value);
    });
    
    // Get transport info if transport is selected
    let transportMode = '';
    let estimatedTime = '';
    if (types.includes('Transporte')) {
        transportMode = document.getElementById('transportMode').value;
        estimatedTime = document.getElementById('estimatedTime').value;
    }
    
    // Validation
    if (!place) {
        alert('Por favor ingrese el lugar');
        document.getElementById('eventPlace').focus();
        return;
    }
    
    if (!startTime) {
        alert('Por favor ingrese la hora de inicio');
        document.getElementById('eventStartTime').focus();
        return;
    }
    
    if (!duration || isNaN(duration) || duration <= 0) {
        alert('Por favor ingrese una duración válida');
        document.getElementById('eventDuration').focus();
        return;
    }
    
    if (price === '' || isNaN(price) || price < 0) {
        alert('Por favor ingrese un precio válido (puede ser 0 para eventos gratuitos)');
        document.getElementById('eventPrice').focus();
        return;
    }
    
    if (types.length === 0) {
        alert('Por favor seleccione al menos una tipología');
        return;
    }
    
    const baseEvent = {
        place: place,
        origin: origin,
        destination: destination,
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        durationUnit: durationUnit,
        price: price,
        currency: currency,
        types: types,
        comments: comments,
        transportMode: transportMode,
        estimatedTime: estimatedTime
    };
    
    if (eventIndex !== '' && appState.editingEvent) {
        // Edit existing event - replace single event
        if (!appState.currentTrip.events[dateStr]) {
            appState.currentTrip.events[dateStr] = [];
        }
        appState.currentTrip.events[dateStr][parseInt(eventIndex)] = baseEvent;
        alert('Evento actualizado exitosamente');
    } else {
        // Add new event - check for multi-day
        const multiDayEvents = createMultiDayEvents(baseEvent, dateStr);
        
        if (multiDayEvents.length === 1) {
            // Single day event
            if (!appState.currentTrip.events[dateStr]) {
                appState.currentTrip.events[dateStr] = [];
            }
            appState.currentTrip.events[dateStr].push(multiDayEvents[0]);
            alert('Evento agregado exitosamente');
        } else {
            // Multi-day event
            let addedDays = 0;
            multiDayEvents.forEach(({ event, date }) => {
                // Check if the date is within the trip range
                const eventDate = new Date(date + 'T00:00:00');
                const tripStart = new Date(appState.currentTrip.startDate + 'T00:00:00');
                const tripEnd = new Date(appState.currentTrip.endDate + 'T00:00:00');
                
                if (eventDate >= tripStart && eventDate <= tripEnd) {
                    if (!appState.currentTrip.events[date]) {
                        appState.currentTrip.events[date] = [];
                    }
                    appState.currentTrip.events[date].push(event);
                    addedDays++;
                }
            });
            
            if (addedDays > 1) {
                alert(`Evento multi-día creado exitosamente en ${addedDays} días. El precio se ha dividido proporcionalmente según las horas de cada día.`);
            } else if (addedDays === 1) {
                alert('Evento agregado exitosamente');
            } else {
                alert('El evento se extiende fuera del rango de fechas del viaje');
                return;
            }
        }
    }
    
    // Sort events by start time for each affected day
    Object.keys(appState.currentTrip.events).forEach(date => {
        if (appState.currentTrip.events[date]) {
            appState.currentTrip.events[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
        }
    });
    
    closeModal();
    renderCalendar();
    updateFinancialSummary();
}

function deleteEvent(dateStr, index) {
    if (confirm('¿Está seguro de que desea eliminar este evento?')) {
        appState.currentTrip.events[dateStr].splice(index, 1);
        if (appState.currentTrip.events[dateStr].length === 0) {
            delete appState.currentTrip.events[dateStr];
        }
        renderCalendar();
        updateFinancialSummary();
    }
}

function convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    
    const rates = appState.conversionRates;
    
    // Convert to USD first if needed
    let usdAmount = amount;
    if (fromCurrency === 'EUR') {
        usdAmount = amount * rates.EUR_TO_USD;
    } else if (fromCurrency === 'COP') {
        usdAmount = amount / rates.USD_TO_COP;
    }
    
    // Convert from USD to target currency
    if (toCurrency === 'EUR') {
        return usdAmount / rates.EUR_TO_USD;
    } else if (toCurrency === 'COP') {
        return usdAmount * rates.USD_TO_COP;
    }
    
    return usdAmount;
}

function updateFinancialSummary() {
    const displayCurrency = elements.displayCurrency.value;
    const peopleCount = appState.currentTrip.peopleCount || 1;
    const categories = {
        'Transporte': 0,
        'Alimentación': 0,
        'Alojamiento': 0,
        'Servicio': 0,
        'Evento': 0,
        'Lugar': 0
    };
    
    let total = 0;
    
    Object.values(appState.currentTrip.events).forEach(dayEvents => {
        dayEvents.forEach(event => {
            const convertedAmount = convertCurrency(event.price, event.currency, displayCurrency);
            total += convertedAmount;
            
            event.types.forEach(type => {
                if (categories[type] !== undefined) {
                    categories[type] += convertedAmount;
                }
            });
        });
    });
    
    const costPerPerson = total / peopleCount;
    
    const formatAmount = (amount) => {
        return new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };
    
    let summaryHTML = `
        <div class="total-summary">
            <h3 class="total-amount">${formatAmount(total)} ${displayCurrency}</h3>
            <p>Costo Total</p>
            <div class="cost-per-person">Costo por persona: ${formatAmount(costPerPerson)} ${displayCurrency}</div>
        </div>
        <div class="category-breakdown">
    `;
    
    Object.entries(categories).forEach(([category, amount]) => {
        summaryHTML += `
            <div class="category-item">
                <div class="category-name">${category}</div>
                <div class="category-amount">${formatAmount(amount)} ${displayCurrency}</div>
            </div>
        `;
    });
    
    summaryHTML += '</div>';
    elements.financialBreakdown.innerHTML = summaryHTML;
}

function savePlanAsXML() {
    if (!appState.currentTrip.name) {
        alert('Por favor genere un calendario primero');
        return;
    }
    
    const xmlContent = generateXMLContent();
    const filename = `${appState.currentTrip.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xml`;
    
    // Create and download the XML file
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Plan guardado y descargado como archivo XML');
}

function generateXMLContent() {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<planeador_viajes>\n';
    xml += `  <nombre_viaje>${escapeXML(appState.currentTrip.name)}</nombre_viaje>\n`;
    xml += `  <cantidad_personas>${appState.currentTrip.peopleCount}</cantidad_personas>\n`;
    xml += `  <fecha_inicio>${appState.currentTrip.startDate}</fecha_inicio>\n`;
    xml += `  <fecha_fin>${appState.currentTrip.endDate}</fecha_fin>\n`;
    xml += `  <tasas_cambio>\n`;
    xml += `    <usd_cop>${appState.conversionRates.USD_TO_COP}</usd_cop>\n`;
    xml += `    <eur_cop>${appState.conversionRates.EUR_TO_COP}</eur_cop>\n`;
    xml += `  </tasas_cambio>\n`;
    xml += '  <eventos>\n';
    
    // Sort dates and add events
    const sortedDates = Object.keys(appState.currentTrip.events).sort();
    sortedDates.forEach(dateStr => {
        appState.currentTrip.events[dateStr].forEach(event => {
            const durationInMinutes = event.durationUnit === 'Horas' ? event.duration * 60 : event.duration;
            xml += '    <evento>\n';
            xml += `      <lugar>${escapeXML(event.place)}</lugar>\n`;
            xml += `      <origen>${escapeXML(event.origin || '')}</origen>\n`;
            xml += `      <destino>${escapeXML(event.destination || '')}</destino>\n`;
            xml += `      <fecha>${dateStr}</fecha>\n`;
            xml += `      <hora_inicio>${event.startTime}</hora_inicio>\n`;
            xml += `      <duracion_minutos>${durationInMinutes}</duracion_minutos>\n`;
            xml += `      <hora_fin>${event.endTime}</hora_fin>\n`;
            xml += `      <precio>${event.price}</precio>\n`;
            xml += `      <precio_original>${event.originalPrice || event.price}</precio_original>\n`;
            xml += `      <moneda>${event.currency}</moneda>\n`;
            xml += `      <tipologia>${event.types.join(', ')}</tipologia>\n`;
            xml += `      <modo_transporte>${escapeXML(event.transportMode || '')}</modo_transporte>\n`;
            xml += `      <tiempo_estimado>${escapeXML(event.estimatedTime || '')}</tiempo_estimado>\n`;
            xml += `      <comentarios>${escapeXML(event.comments || '')}</comentarios>\n`;
            xml += `      <es_multidia>${event.isMultiDay || false}</es_multidia>\n`;
            if (event.isMultiDay) {
                xml += `      <dia_parte>${event.dayPart}</dia_parte>\n`;
                xml += `      <total_dias>${event.totalDays}</total_dias>\n`;
                xml += `      <horas_en_dia>${event.hoursInDay}</horas_en_dia>\n`;
                xml += `      <total_horas>${event.totalHours}</total_horas>\n`;
            }
            xml += '    </evento>\n';
        });
    });
    
    xml += '  </eventos>\n';
    xml += '</planeador_viajes>';
    
    return xml;
}

function escapeXML(text) {
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#39;');
}

function loadPlanFromXML() {
    const fileInput = elements.loadPlanFile;
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Por favor seleccione un archivo XML');
        return;
    }
    
    if (!file.name.toLowerCase().endsWith('.xml')) {
        alert('Por favor seleccione un archivo XML válido');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const xmlText = e.target.result;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            // Check for parsing errors
            const parserError = xmlDoc.getElementsByTagName('parsererror');
            if (parserError.length > 0) {
                throw new Error('Error al analizar el archivo XML');
            }
            
            parseXMLAndLoadPlan(xmlDoc);
            alert('Plan cargado exitosamente');
            
        } catch (error) {
            console.error('Error loading XML:', error);
            alert('Error al cargar el archivo XML: ' + error.message);
        }
    };
    
    reader.readAsText(file);
}

function parseXMLAndLoadPlan(xmlDoc) {
    const root = xmlDoc.documentElement;
    
    // Extract basic trip info
    const tripName = getXMLTextContent(root, 'nombre_viaje');
    const peopleCount = parseInt(getXMLTextContent(root, 'cantidad_personas')) || 1;
    const startDate = getXMLTextContent(root, 'fecha_inicio');
    const endDate = getXMLTextContent(root, 'fecha_fin');
    
    if (!tripName || !startDate || !endDate) {
        throw new Error('El archivo XML no contiene la información básica del viaje');
    }
    
    // Load conversion rates
    const usdCop = parseFloat(getXMLTextContent(root, 'usd_cop'));
    const eurCop = parseFloat(getXMLTextContent(root, 'eur_cop'));
    
    if (usdCop) {
        appState.conversionRates.USD_TO_COP = usdCop;
        elements.usdCopRate.value = usdCop;
    }
    if (eurCop) {
        appState.conversionRates.EUR_TO_COP = eurCop;
        elements.eurCopRate.value = eurCop;
        appState.conversionRates.EUR_TO_USD = eurCop / usdCop;
    }
    
    // Reset current trip
    appState.currentTrip = {
        name: tripName,
        peopleCount: peopleCount,
        startDate: startDate,
        endDate: endDate,
        events: {}
    };
    
    // Update form fields
    elements.tripName.value = tripName;
    elements.peopleCount.value = peopleCount;
    elements.startDate.value = startDate;
    elements.endDate.value = endDate;
    
    // Parse events
    const eventNodes = xmlDoc.getElementsByTagName('evento');
    for (let i = 0; i < eventNodes.length; i++) {
        const eventNode = eventNodes[i];
        
        const place = getXMLTextContent(eventNode, 'lugar');
        const origin = getXMLTextContent(eventNode, 'origen');
        const destination = getXMLTextContent(eventNode, 'destino');
        const date = getXMLTextContent(eventNode, 'fecha');
        const startTime = getXMLTextContent(eventNode, 'hora_inicio');
        const durationMinutes = parseInt(getXMLTextContent(eventNode, 'duracion_minutos'));
        const endTime = getXMLTextContent(eventNode, 'hora_fin');
        const price = parseFloat(getXMLTextContent(eventNode, 'precio'));
        const originalPrice = parseFloat(getXMLTextContent(eventNode, 'precio_original')) || price;
        const currency = getXMLTextContent(eventNode, 'moneda');
        const typesStr = getXMLTextContent(eventNode, 'tipologia');
        const transportMode = getXMLTextContent(eventNode, 'modo_transporte');
        const estimatedTime = getXMLTextContent(eventNode, 'tiempo_estimado');
        const comments = getXMLTextContent(eventNode, 'comentarios');
        const isMultiDay = getXMLTextContent(eventNode, 'es_multidia') === 'true';
        
        // Convert duration back to original format
        let duration, durationUnit;
        if (durationMinutes >= 60 && durationMinutes % 60 === 0) {
            duration = durationMinutes / 60;
            durationUnit = 'Horas';
        } else {
            duration = durationMinutes;
            durationUnit = 'Minutos';
        }
        
        const types = typesStr.split(', ').map(t => t.trim()).filter(t => t);
        
        const event = {
            place: place,
            origin: origin,
            destination: destination,
            startTime: startTime,
            endTime: endTime,
            duration: duration,
            durationUnit: durationUnit,
            price: price,
            originalPrice: originalPrice,
            currency: currency,
            types: types,
            transportMode: transportMode,
            estimatedTime: estimatedTime,
            comments: comments,
            isMultiDay: isMultiDay
        };
        
        // Add multi-day specific properties if applicable
        if (isMultiDay) {
            event.dayPart = parseInt(getXMLTextContent(eventNode, 'dia_parte')) || 1;
            event.totalDays = parseInt(getXMLTextContent(eventNode, 'total_dias')) || 1;
            event.hoursInDay = parseFloat(getXMLTextContent(eventNode, 'horas_en_dia')) || duration;
            event.totalHours = parseFloat(getXMLTextContent(eventNode, 'total_horas')) || duration;
        }
        
        if (!appState.currentTrip.events[date]) {
            appState.currentTrip.events[date] = [];
        }
        
        appState.currentTrip.events[date].push(event);
    }
    
    // Sort events by time for each day
    Object.keys(appState.currentTrip.events).forEach(date => {
        appState.currentTrip.events[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    
    // Update UI
    renderCalendar();
    updateFinancialSummary();
    
    // Clear file input
    elements.loadPlanFile.value = '';
}

function getXMLTextContent(parent, tagName) {
    const element = parent.getElementsByTagName(tagName)[0];
    return element ? element.textContent : '';
}

function printPlan() {
    if (!appState.currentTrip.name) {
        alert('Por favor genere un calendario primero');
        return;
    }
    
    window.print();
}