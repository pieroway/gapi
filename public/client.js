document.addEventListener('DOMContentLoaded', () => {
    const listPanel = document.getElementById('list-panel');
    const listPanelHeader = listPanel.querySelector('.panel-header');
    const detailPanel = document.getElementById('detail-panel');
    const detailPanelHeader = detailPanel.querySelector('.panel-header');
    const detailTitle = document.getElementById('detail-title');
    const detailContent = document.getElementById('detail-content');
    const eventsContainer = document.getElementById('events-container');
    const saleTypePillsContainer = document.getElementById('sale-type-pills-container');
    const categoryPillsContainer = document.getElementById('category-pills-container');
    const qrContainer = document.getElementById('qr-code-container');
    const qrModal = document.getElementById('qr-modal');
    const centerLocationButton = document.getElementById('center-location-button');
    const debugOverlay = document.getElementById('debug-overlay');
    const collapseButton = document.getElementById('collapse-button');
    const expandButton = document.getElementById('expand-button');
    const mapElement = document.getElementById('map');
    const detailBackButton = document.getElementById('detail-back-button');
    const searchInput = document.getElementById('search-input');
    const refreshEventsBtn = document.getElementById('refresh-events-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const scrollToTopBtn = document.getElementById('scroll-to-top-btn');
    const addEventBtn = document.getElementById('add-event-btn');
    const submissionModal = document.getElementById('submission-modal');
    const submissionForm = document.getElementById('submission-form');
    const cancelSubmissionBtn = document.getElementById('cancel-submission-btn');
    const eventCategoriesContainer = document.getElementById('event-categories-container');
    const eventSaleTypePillsContainer = document.getElementById('event-sale-type-pills');
    const eventPhotoInput = document.getElementById('event-photo');
    const eventTitleInput = document.getElementById('event-title');
    const eventDescriptionInput = document.getElementById('event-description');
    const eventAddressInput = document.getElementById('event-address');
    const eventStartInput = document.getElementById('event-start');
    const eventEndInput = document.getElementById('event-end');
    const photoPreview = document.getElementById('photo-preview');
    eventPhotoInput.multiple = true;
    eventPhotoInput.accept = 'image/*';
    const reportModal = document.getElementById('report-modal');
    const reportForm = document.getElementById('report-form');
    const cancelReportBtn = document.getElementById('cancel-report-btn');
    const reportEventTitle = document.getElementById('report-event-title');
    const reportEventIdInput = document.getElementById('report-event-id');
    const reportDetailsGroup = document.getElementById('report-details-group');
    const clusteringToggle = document.getElementById('clustering-toggle');
    const clearFiltersWrapper = document.getElementById('clear-filters-wrapper');
    const clearAllFiltersBtn = document.getElementById('clear-all-filters-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const mapTypeRadios = document.querySelectorAll('input[name="map-type"]');
    const debugToggle = document.getElementById('debug-toggle');
    const zoomLevelSlider = document.getElementById('zoom-level-slider');
    const zoomLevelValue = document.getElementById('zoom-level-value');
    let AdvancedMarkerElement = null;
    let PinElement = null;

    const isDesktop = () => window.matchMedia('(min-width: 769px)').matches;

    class CustomClusterRenderer {
        render(cluster, _stats, map) {
            const { count, position } = cluster;

            let color = '#007bff'; // Default blue for small clusters (< 25)
            if (count >= 100) color = '#dc3545'; // Red for large clusters (100+)
            else if (count >= 25) color = '#fd7e14'; // Orange for medium clusters (25-99)

            const svg = `
                <svg fill="${color}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="50" height="50">
                    <circle cx="120" cy="120" opacity=".6" r="70" />
                    <circle cx="120" cy="120" opacity=".3" r="90" />
                    <circle cx="120" cy="120" opacity=".2" r="110" />
                    <text x="50%" y="50%" style="fill:#fff" text-anchor="middle" font-size="50" dominant-baseline="middle" font-family="roboto,arial,sans-serif">${count}</text>
                </svg>`;
            const zIndex = Number(google.maps.Marker.MAX_ZINDEX) + count;

            const buildInfoWindowContent = () => {
                const maxTitles = 5;
                const titles = cluster.markers
                    .slice(0, maxTitles)
                    .map(m => {
                        const event = allEvents.find(e => e.id === m.eventId);
                        const escapedTitle = event ? event.title.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
                        return event ? `<li>${escapedTitle}</li>` : '';
                    })
                    .join('');

                const moreCount = count - maxTitles;
                return `
                    <div class="cluster-info-window">
                        <strong>${count} Events Here</strong>
                        <ul class="cluster-info-list">${titles}</ul>
                        ${moreCount > 0 ? `<p class="cluster-info-more">...and ${moreCount} more.</p>` : ''}
                    </div>`;
            };

            const onMouseOver = (anchor) => {
                if (!clusterInfoWindow) return;
                clusterInfoWindow.close();
                clusterInfoWindow.setContent(buildInfoWindowContent());
                clusterInfoWindow.open({ map, anchor, shouldFocus: false });
            };

            const onMouseOut = () => {
                if (clusterInfoWindow) {
                    clusterInfoWindow.close();
                }
            };

            const parser = new DOMParser();
            const svgEl = parser.parseFromString(svg, "image/svg+xml").documentElement;
            svgEl.setAttribute("transform", "translate(0 25)");

            const marker = new AdvancedMarkerElement({ map, position, zIndex, content: svgEl });

            marker.content.addEventListener('mouseenter', () => onMouseOver(marker));
            marker.content.addEventListener('mouseleave', onMouseOut);

            return marker;
        }
    }

    const CLUSTERING_KEY = 'eventsMapClusteringEnabled';
    const MAP_TYPE_KEY = 'eventsMapType';
    const DEBUG_OVERLAY_KEY = 'eventsMapDebugOverlayEnabled';
    const ZOOM_LEVEL_KEY = 'eventsMapDefaultZoom';
    // Keys for persisting UI state
    const LIST_PANEL_COLLAPSED_KEY = 'eventsMapListPanelCollapsed';
    const DEBUG_COLLAPSED_KEY = 'eventsMapDebugCollapsed';
    const DEBUG_POSITION_KEY = 'eventsMapDebugPosition';

    // Load and apply the saved clustering preference
    const savedClusteringPref = localStorage.getItem(CLUSTERING_KEY);
    clusteringToggle.checked = savedClusteringPref === 'true'; // Default to false if null or not 'true'

    // Load and apply the saved debug overlay preference
    const savedDebugPref = localStorage.getItem(DEBUG_OVERLAY_KEY);
    const isDebugEnabled = savedDebugPref === 'true';
    debugToggle.checked = isDebugEnabled;
    debugOverlay.style.display = isDebugEnabled ? 'block' : 'none';

    // Load and apply saved debug overlay collapsed state
    const isDebugCollapsed = localStorage.getItem(DEBUG_COLLAPSED_KEY) === 'true';
    if (isDebugCollapsed) {
        debugOverlay.classList.add('collapsed');
    }

    // Load and apply saved debug overlay position (desktop only)
    if (isDesktop()) {
        const savedDebugPosition = localStorage.getItem(DEBUG_POSITION_KEY);
        if (savedDebugPosition) {
            try {
                const { top, left } = JSON.parse(savedDebugPosition);
                debugOverlay.style.transform = 'none'; // Remove centering
                debugOverlay.style.top = top;
                debugOverlay.style.left = left;
            } catch (e) {
                console.error("Failed to parse debug overlay position", e);
                localStorage.removeItem(DEBUG_POSITION_KEY);
            }
        }
    }

    // Load and apply the saved zoom level preference
    const savedZoom = localStorage.getItem(ZOOM_LEVEL_KEY) || '12';
    zoomLevelSlider.value = savedZoom;
    zoomLevelValue.textContent = savedZoom;

    // Load and apply saved list panel state (desktop only)
    if (isDesktop() && localStorage.getItem(LIST_PANEL_COLLAPSED_KEY) === 'true') {
        listPanel.classList.add('closed');
        mapElement.classList.add('panel-closed');
    }

    const urlParams = new URLSearchParams(window.location.search);
    const eventIdFromUrl = urlParams.get('event');

    let isListPanelOpen = false;
    let allEvents = [];
    let allMarkers = [];
    let allCategories = [];
    let markerCluster = null;
    let allSaleTypes = [];
    let lastSelectedPosition = null;
    let userLocationMarker = null;
    let activeMarker = null;
    let hoveredMarker = null;
    let isFollowingUser = false;
    let highlightedLegacyIcon = null;
    let clusterInfoWindow = null;

    let elementThatOpenedDetailPanel = null;

    let submissionCoordinates = null;
    let currentlySelectedEventForDebug = null;

    // --- New variables for multi-image upload ---
    const MAX_PHOTOS = 10;
    let submissionPhotos = [];

    // --- Favorites Logic ---
    const FAVORITES_KEY = 'garageSaleFavorites';

    const getFavorites = () => {
        const favorites = localStorage.getItem(FAVORITES_KEY);
        return favorites ? JSON.parse(favorites) : [];
    };

    const saveFavorites = (favorites) => {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    };

    const resizeImage = (file, maxWidth, maxHeight, quality = 0.8) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (!blob) {
                            return reject(new Error('Canvas to Blob conversion failed.'));
                        }
                        const resizedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
                        resolve(resizedFile);
                    }, 'image/jpeg', quality);
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const isFavorite = (eventId) => {
        return getFavorites().includes(eventId);
    };

    const updateFavoriteUI = (eventId, isNowFavorite) => {
        // Update the UI for the card in the list
        const cardInList = eventsContainer.querySelector(`.card[data-event-id="${eventId}"]`);
        if (cardInList) {
            const cardFavBtn = cardInList.querySelector('.favorite-btn');
            if (cardFavBtn) {
                cardFavBtn.classList.toggle('active', isNowFavorite);
            }
        }

        // Update the UI for the detail panel button if it's open for this event
        if (detailPanel.classList.contains('open') && currentlySelectedEventForDebug?.id === eventId) {
            const detailFavoriteBtn = document.getElementById('detail-favorite-btn');
            detailFavoriteBtn.classList.toggle('active', isNowFavorite);
        }
    };

    const toggleFavorite = (eventId) => {
        let favorites = getFavorites();
        const isCurrentlyFavorite = favorites.includes(eventId);
        const isNowFavorite = !isCurrentlyFavorite;

        const newFavorites = isNowFavorite ? [...favorites, eventId] : favorites.filter(id => id !== eventId);
        saveFavorites(newFavorites);

        updateFavoriteUI(eventId, isNowFavorite);

        // If the "Favorites" filter is active, re-render to reflect the change
        if (document.querySelector('.sale-type-pill[data-sale-type="favorites"]')?.classList.contains('active')) {
            filterAndDisplayEvents();
        }
    };

    function setupImageSlider(sliderElement) {
        if (!sliderElement) return;

        const inner = sliderElement.querySelector('.slider-inner');
        const slides = sliderElement.querySelectorAll('.slider-slide');
        const dotsContainer = sliderElement.querySelector('.slider-dots');
        const prevBtn = sliderElement.querySelector('.slider-btn.prev');
        const nextBtn = sliderElement.querySelector('.slider-btn.next');

        // If there's only one slide or fewer, hide navigation
        if (!inner || !slides || slides.length <= 1) {
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            if (dotsContainer) dotsContainer.style.display = 'none';
            return;
        }

        const dots = sliderElement.querySelectorAll('.slider-dot');
        let currentIndex = 0;

        function goToSlide(index) {
            if (index < 0 || index >= slides.length) return;
            inner.style.transform = `translateX(-${index * 100}%)`;
            dots.forEach(dot => dot.classList.remove('active'));
            if (dots[index]) {
                dots[index].classList.add('active');
            }
            currentIndex = index;
        }

        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card/panel click
            goToSlide(currentIndex - 1 < 0 ? slides.length - 1 : currentIndex - 1);
        });

        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card/panel click
            goToSlide((currentIndex + 1) % slides.length);
        });

        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.target.dataset.slideIndex, 10);
                if (!isNaN(index)) goToSlide(index);
            });
        });
    }

    // --- Debug Panel Setup ---
    debugOverlay.innerHTML = '<div id="debug-header">Debug</div><div id="debug-content"></div>';
    const debugHeader = document.getElementById('debug-header');

    let wasDragged = false;

    // Collapse/Expand
    debugHeader.addEventListener('click', () => {
        if (wasDragged) {
            wasDragged = false; // Reset for next click
            return;
        }
        const isCollapsed = debugOverlay.classList.toggle('collapsed');
        localStorage.setItem(DEBUG_COLLAPSED_KEY, isCollapsed);
    });

    // Draggable on Desktop
    let isDragging = false;
    let offsetX, offsetY;

    const onDragStart = (e) => {
        if (!isDesktop()) return;

        isDragging = true;
        wasDragged = false;

        // If the panel is centered with transform, calculate absolute position before dragging
        const style = window.getComputedStyle(debugOverlay);
        if (style.transform !== 'none' && style.transform !== 'matrix(1, 0, 0, 1, 0, 0)') {
            const rect = debugOverlay.getBoundingClientRect();
            debugOverlay.style.transform = 'none';
            debugOverlay.style.left = `${rect.left}px`;
            debugOverlay.style.top = `${rect.top}px`;
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
        } else {
            offsetX = e.clientX - debugOverlay.offsetLeft;
            offsetY = e.clientY - debugOverlay.offsetTop;
        }

        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
    };

    const onDragMove = (e) => {
        if (!isDragging) return;
        wasDragged = true; // It's a drag, not a click
        debugOverlay.style.left = `${e.clientX - offsetX}px`;
        debugOverlay.style.top = `${e.clientY - offsetY}px`;
    };

    const onDragEnd = () => {
        isDragging = false;
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);

        // Save the final position to localStorage
        const positionToSave = {
            top: debugOverlay.style.top,
            left: debugOverlay.style.left
        };
        localStorage.setItem(DEBUG_POSITION_KEY, JSON.stringify(positionToSave));
    };

    debugHeader.addEventListener('mousedown', onDragStart);

    // --- Report Event Logic ---
    function openReportModal(event) {
        reportEventTitle.textContent = event.title;
        reportEventIdInput.value = event.id;
        reportForm.reset();
        reportDetailsGroup.style.display = 'none';
        reportDetailsGroup.querySelector('textarea').required = false;
        reportModal.classList.add('visible');
    }

    cancelReportBtn.addEventListener('click', () => {
        reportModal.classList.remove('visible');
    });

    reportModal.addEventListener('click', (e) => {
        if (e.target === reportModal) {
            reportModal.classList.remove('visible');
        }
    });

    reportForm.querySelectorAll('input[name="reason"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const detailsRequired = e.target.value === 'other';
            reportDetailsGroup.style.display = detailsRequired ? 'block' : 'none';
            reportDetailsGroup.querySelector('textarea').required = detailsRequired;
        });
    });

    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-report-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        const eventId = reportEventIdInput.value;
        const formData = new FormData(reportForm);
        const payload = {
            event_id: eventId, // Add event ID to the payload
            reason: formData.get('reason'),
            details: formData.get('details') || ''
        };

        try {
            // Use the correct endpoint for creating reports
            const response = await fetch(`/api/reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                let errorMessage = 'Failed to submit report.';
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } else {
                    errorMessage = `Server returned an error (Status: ${response.status}). Please try again.`;
                }
                throw new Error(errorMessage);
            }

            alert('Thank you for your report. It has been submitted for review.');
            reportModal.classList.remove('visible');

        } catch (error) {
            console.error('Report submission error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Report';
        }
    });

    // --- Submission Form Logic ---

    const showError = (inputElement, message) => {
        const formGroup = inputElement.closest('.form-group');
        if (!formGroup) return;

        // Remove any existing error to prevent duplicates
        clearError(inputElement);

        inputElement.classList.add('is-invalid');

        const error = document.createElement('div');
        error.className = 'error-message';
        error.textContent = message;
        formGroup.appendChild(error);
    };

    const clearError = (inputElement) => {
        inputElement.classList.remove('is-invalid');
        const formGroup = inputElement.closest('.form-group');
        if (formGroup) {
            const error = formGroup.querySelector('.error-message');
            if (error) {
                error.remove();
            }
        }
    };

    const validateForm = () => {
        let isFormValid = true;
        const isRequired = (el) => el.value && el.value.trim() !== '';

        // 1. Validate Title
        clearError(eventTitleInput);
        if (!isRequired(eventTitleInput)) {
            showError(eventTitleInput, 'Title is required.');
            isFormValid = false;
        }

        // 2. Validate Description
        clearError(eventDescriptionInput);
        if (!isRequired(eventDescriptionInput)) {
            showError(eventDescriptionInput, 'Description is required.');
            isFormValid = false;
        }

        // 3. Validate Address
        clearError(eventAddressInput);
        if (!isRequired(eventAddressInput)) {
            showError(eventAddressInput, 'Address is required.');
            isFormValid = false;
        } else if (!submissionCoordinates) {
            // This check ensures a valid, geocoded address was selected from the dropdown.
            // It prevents submitting a manually typed address that has no coordinates.
            showError(eventAddressInput, 'Please select a valid address from the suggestions.');
            isFormValid = false;
        }

        // 4. Validate Sale Type
        const saleTypeHiddenInput = document.getElementById('event-sale-type-hidden');
        clearError(eventSaleTypePillsContainer); // Clear error from the container
        if (!isRequired(saleTypeHiddenInput)) {
            showError(eventSaleTypePillsContainer, 'Please select a sale type.');
            isFormValid = false;
        }

        // 5. Validate Start and End Times
        clearError(eventStartInput);
        if (!isRequired(eventStartInput)) {
            showError(eventStartInput, 'Start time is required.');
            isFormValid = false;
        }

        clearError(eventEndInput);
        if (!isRequired(eventEndInput)) {
            showError(eventEndInput, 'End time is required.');
            isFormValid = false;
        } else if (eventStartInput.value && new Date(eventEndInput.value) <= new Date(eventStartInput.value)) {
            // This error is more specific, so it can overwrite the 'required' one if needed
            showError(eventEndInput, 'End time must be after start time.');
            isFormValid = false;
        }

        // 6. Validate Categories
        clearError(eventCategoriesContainer);
        if (eventCategoriesContainer.querySelectorAll('input[type="checkbox"]:checked').length === 0) {
            showError(eventCategoriesContainer, 'Please select at least one category.');
            isFormValid = false;
        }

        return isFormValid;
    };

    const renderPhotoPreviews = () => {
        photoPreview.innerHTML = ''; // Clear everything

        // Render image previews
        submissionPhotos.forEach((file, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'photo-preview-item';
            // Add a placeholder while the image loads
            previewItem.innerHTML = `
                <div class="image-placeholder"><div class="spinner-small"></div></div>
                <button type="button" class="remove-photo-btn" data-index="${index}" title="Remove photo">&times;</button>
            `;
            photoPreview.appendChild(previewItem);

            const reader = new FileReader();
            reader.onload = (e) => {
                // Replace placeholder with the actual image
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Photo preview">
                    <button type="button" class="remove-photo-btn" data-index="${index}" title="Remove photo">&times;</button>
                `;
            };
            reader.readAsDataURL(file);
        });

        // Add the upload button if there's space
        if (submissionPhotos.length < MAX_PHOTOS) {
            const dynamicUploadBtn = document.createElement('button');
            dynamicUploadBtn.type = 'button';
            dynamicUploadBtn.className = 'upload-photo-btn'; // A class for styling
            dynamicUploadBtn.innerHTML = `
                <span class="upload-btn-text">Upload Photo</span>
                <span class="upload-btn-counter">${submissionPhotos.length}/${MAX_PHOTOS}</span>
            `;
            photoPreview.appendChild(dynamicUploadBtn);
        }
    };

    // Use event delegation for remove and upload buttons
    photoPreview.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-photo-btn')) {
            const index = parseInt(e.target.dataset.index, 10);
            if (!isNaN(index)) {
                submissionPhotos.splice(index, 1);
                renderPhotoPreviews();
            }
        } else if (e.target.closest('.upload-photo-btn')) {
            eventPhotoInput.click();
        }
    });

    // --- Real-time validation setup ---
    const fieldsForRealtimeValidation = [
        eventTitleInput, eventDescriptionInput, eventAddressInput,
        eventStartInput, eventEndInput
    ];

    fieldsForRealtimeValidation.forEach(field => {
        field.addEventListener('input', validateForm);
        field.addEventListener('change', validateForm);
    });
    eventCategoriesContainer.addEventListener('change', validateForm);

    eventPhotoInput.addEventListener('change', async () => {
        const files = Array.from(eventPhotoInput.files);
        const remainingSlots = MAX_PHOTOS - submissionPhotos.length;

        if (files.length === 0) return;

        if (files.length > remainingSlots) {
            alert(`You can only add ${remainingSlots} more photo(s). Only the first ${remainingSlots} will be added.`);
            files.splice(remainingSlots); // Keep only what fits
        }

        // Show a processing indicator on the upload button
        const uploadBtn = photoPreview.querySelector('.upload-photo-btn');
        if (uploadBtn) {
            uploadBtn.disabled = true;
            // Replace content with a spinner
            uploadBtn.innerHTML = `<div class="spinner-small"></div>`;
        }

        try {
            // Resize images before adding them to the submission list
            const resizingPromises = files.map(file => resizeImage(file, 1280, 1280));
            const resizedFiles = await Promise.all(resizingPromises);

            submissionPhotos.push(...resizedFiles);
        } catch (error) {
            console.error("Image resizing failed:", error);
            alert("There was an error processing one or more images. Please try again with different files.");
        } finally {
            // Always re-render to show new previews or restore the button on error
            renderPhotoPreviews();
            // Reset the input so the same file can be selected again if removed.
            eventPhotoInput.value = '';
        }
    });

    const formatDateTimeLocal = (date) => {
        if (!(date instanceof Date) || isNaN(date)) return '';
        // Create a copy to avoid mutating the original date object
        const tempDate = new Date(date);
        // Adjust for timezone offset to display correctly in user's local time
        tempDate.setMinutes(tempDate.getMinutes() - tempDate.getTimezoneOffset());
        return tempDate.toISOString().slice(0, 16);
    };

    addEventBtn.addEventListener('click', () => {
        submissionForm.reset();
        submissionPhotos = [];
        document.getElementById('event-sale-type-hidden').value = '';
        renderPhotoPreviews();
        
        // Set default start and end times for today
        const today = new Date();
        const defaultStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0, 0); // 8:00 AM
        const defaultEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0, 0); // 2:00 PM
        eventStartInput.value = formatDateTimeLocal(defaultStart);
        eventEndInput.value = formatDateTimeLocal(defaultEnd);

        // Clear all previous validation errors
        submissionForm.querySelectorAll('.is-invalid').forEach(el => clearError(el));
        eventSaleTypePillsContainer.querySelectorAll('.active').forEach(p => p.classList.remove('active'));
        submissionModal.classList.add('visible');
    });

    cancelSubmissionBtn.addEventListener('click', () => {
        submissionModal.classList.remove('visible');
    });

    submissionModal.addEventListener('click', (e) => {
        if (e.target === submissionModal) {
            submissionModal.classList.remove('visible');
        }
    });

    eventSaleTypePillsContainer.addEventListener('click', (e) => {  
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;

        // A pill was clicked, clear any validation error on the container
        clearError(eventSaleTypePillsContainer);

        if (pill.classList.contains('active')) return;

        // Deactivate other pills
        eventSaleTypePillsContainer.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));

        pill.classList.add('active');
        document.getElementById('event-sale-type-hidden').value = pill.dataset.saleTypeId;
    });

    submissionForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const submitBtn = document.getElementById('submit-event-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        // Manually construct the payload to ensure correct types, similar to the admin edit form.
        const formValues = new FormData(submissionForm);
        const payload = {
            title: formValues.get('title'),
            description: formValues.get('description'),
            address: formValues.get('address'),
            latitude: submissionCoordinates.lat,
            longitude: submissionCoordinates.lng,
            start_datetime: new Date(formValues.get('start_datetime')).toISOString(),
            end_datetime: new Date(formValues.get('end_datetime')).toISOString(),
            sale_type_id: parseInt(formValues.get('sale_type_id'), 10),
            item_categories: formValues.getAll('item_categories').map(id => parseInt(id, 10))
        };

        // Create a new FormData object for the final submission.
        const submissionData = new FormData();

        // Append the JSON payload as a string. The server will need to parse this.
        submissionData.append('eventData', JSON.stringify(payload));

        // Append photo files. Use 'photos' as the key for multiple files.
        if (submissionPhotos.length > 0) {
            submissionPhotos.forEach(file => {
                submissionData.append('photos', file);
            });
        }

        try {
            // When sending FormData, do not set the Content-Type header.
            const response = await fetch('/api/events', {
                method: 'POST',
                body: submissionData
            });

            if (!response.ok) {
                let errorMessage = 'Failed to submit event.';
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    // If the server sent a specific JSON error, use it.
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } else {
                    // Otherwise, it's likely an HTML error page.
                    errorMessage = `Server returned an error (Status: ${response.status}). Please check server logs and try again.`;
                }
                throw new Error(errorMessage);
            }
            const newEvent = await response.json();
            allEvents.push(newEvent);
            filterAndDisplayEvents(); // Refresh the list and map
            submissionModal.classList.remove('visible');
            submissionForm.reset();
            submissionPhotos = []; // Clear photos after successful submission
            renderPhotoPreviews(); // Clear previews
            alert('Event submitted successfully!');
        } catch (error) {
            console.error('Submission error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Event';
        }
    });

    // --- Panel Interactions ---
    collapseButton.addEventListener('click', () => {
        listPanel.classList.add('closed');
        mapElement.classList.add('panel-closed');
        localStorage.setItem(LIST_PANEL_COLLAPSED_KEY, 'true');
    });

    expandButton.addEventListener('click', () => {
        listPanel.classList.remove('closed');
        mapElement.classList.remove('panel-closed');
        localStorage.setItem(LIST_PANEL_COLLAPSED_KEY, 'false');
    });

    // --- Settings Modal Logic ---
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('visible');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('visible');
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('visible');
        }
    });

    clusteringToggle.addEventListener('change', () => {
        // Save the user's preference to localStorage
        localStorage.setItem(CLUSTERING_KEY, clusteringToggle.checked);
        filterAndDisplayEvents();
    });

    mapTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const newMapType = e.target.value;
            if (map) {
                map.setMapTypeId(newMapType);
            }
            localStorage.setItem(MAP_TYPE_KEY, newMapType);
        });
    });

    debugToggle.addEventListener('change', () => {
        const isEnabled = debugToggle.checked;
        localStorage.setItem(DEBUG_OVERLAY_KEY, isEnabled);
        debugOverlay.style.display = isEnabled ? 'block' : 'none';
    });

    zoomLevelSlider.addEventListener('input', () => {
        zoomLevelValue.textContent = zoomLevelSlider.value;
    });

    zoomLevelSlider.addEventListener('change', () => {
        const newZoom = zoomLevelSlider.value;
        localStorage.setItem(ZOOM_LEVEL_KEY, newZoom);
    });

    refreshEventsBtn.addEventListener('click', refreshEvents);

    clearAllFiltersBtn.addEventListener('click', clearAllFilters);

    searchInput.addEventListener('input', filterAndDisplayEvents);

    eventsContainer.addEventListener('scroll', () => {
        if (eventsContainer.scrollTop > 300) {
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
        }
    });

    scrollToTopBtn.addEventListener('click', () => {
        eventsContainer.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    centerLocationButton.addEventListener('click', () => {
        isFollowingUser = true;
        centerLocationButton.classList.add('following');
        const userPos = getMarkerPosition(userLocationMarker);
        if (userPos) {
            smoothPanTo(userPos, 300, () => map.setZoom(15));
        }
    });

    // --- Mobile Panel Drag-to-Open/Close ---
    let touchStartY = 0;
    let initialPanelHeight = 0;
    let wasPanelDragged = false;

    const onPanelTouchStart = (e) => {
        // If the touch target is a button within the header, don't initiate drag.
        if (e.target.closest('.header-action-btn, #collapse-button')) {
            return;
        }
        if (isDesktop()) return;
        touchStartY = e.touches[0].clientY;
        initialPanelHeight = listPanel.offsetHeight;
        listPanel.style.transition = 'none'; // Disable transition for smooth dragging
        wasPanelDragged = false;
        window.addEventListener('touchmove', onPanelTouchMove, { passive: false });
        window.addEventListener('touchend', onPanelTouchEnd);
    };

    const onPanelTouchMove = (e) => {
        e.preventDefault(); // Prevent page scroll while dragging panel
        const currentY = e.touches[0].clientY;
        const deltaY = touchStartY - currentY; // Upward drag is positive delta
        let newHeight = initialPanelHeight + deltaY;

        // Clamp the height between collapsed (90px) and open (75vh)
        const minHeight = 90;
        const maxHeight = window.innerHeight * 0.75;
        newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));

        listPanel.style.height = `${newHeight}px`;
        wasPanelDragged = true;
    };

    const onPanelTouchEnd = () => {
        window.removeEventListener('touchmove', onPanelTouchMove);
        window.removeEventListener('touchend', onPanelTouchEnd);

        listPanel.style.transition = ''; // Re-enable CSS transition for snapping

        // If it was just a tap, not a drag, toggle the state
        if (!wasPanelDragged) {
            isListPanelOpen = !isListPanelOpen;
            listPanel.classList.toggle('open', isListPanelOpen);
        } else {
            // Snap open or closed based on a threshold
            const currentHeight = listPanel.offsetHeight;
            isListPanelOpen = currentHeight > window.innerHeight * 0.3;
            listPanel.classList.toggle('open', isListPanelOpen);
        }
        listPanel.style.height = ''; // Let CSS class handle the final height with transition
    };

    listPanelHeader.addEventListener('touchstart', onPanelTouchStart);

    qrContainer.addEventListener('click', () => {
        qrModal.style.display = 'flex';
    });

    qrModal.addEventListener('click', () => {
        qrModal.style.display = 'none';
    });

    detailPanelHeader.addEventListener('click', closeDetailPanel);
    detailBackButton.addEventListener('click', closeDetailPanel);

    function setHoveredMarker(markerToHover) {
        // If there's already a hovered marker that isn't the active one, un-highlight it.
        if (hoveredMarker && hoveredMarker !== activeMarker) {
            hoveredMarker.content = hoveredMarker.defaultContent;
            hoveredMarker.zIndex = null;
        }

        // Set the new hovered marker
        hoveredMarker = markerToHover;

        // If the new hovered marker is not the active one, highlight it.
        if (hoveredMarker && hoveredMarker !== activeMarker) {
            hoveredMarker.content = highlightedPinElement;
            hoveredMarker.zIndex = 1;
        }
    }

    function clearHoveredMarker() {
        // If there's a hovered marker and it's not the active one, un-highlight it.
        if (hoveredMarker && hoveredMarker !== activeMarker) {
            hoveredMarker.content = hoveredMarker.defaultContent;
            hoveredMarker.zIndex = null;
        }
        hoveredMarker = null;
    }

    function setActiveMarker(markerToActivate) {
        // Deactivate the old marker
        if (activeMarker) {
            activeMarker.content = activeMarker.defaultContent; // Revert to its original pin
            activeMarker.zIndex = null; // Revert to default z-index
        }

        // Activate the new marker
        if (markerToActivate) {
            markerToActivate.content = highlightedPinElement;
            markerToActivate.zIndex = 1; // Bring to front, above others
        }

        activeMarker = markerToActivate;
    }

    function openDetailPanel(eventId) {
        elementThatOpenedDetailPanel = document.activeElement; // Store focus before opening
        const event = allEvents.find(e => e.id === eventId);
        if (!event) return;
        currentlySelectedEventForDebug = event;
        updateDebugOverlay();

        // Set up the favorite button in the detail panel
        const detailFavoriteBtn = document.getElementById('detail-favorite-btn');
        detailFavoriteBtn.classList.toggle('active', isFavorite(event.id));
        detailFavoriteBtn.onclick = () => {
            toggleFavorite(event.id);
        };

        // Pan map to center the marker in the visible area
        if (event.latitude && event.longitude) {
            const position = { lat: event.latitude, lng: event.longitude };
            const marker = allMarkers.find(m => m.eventId === eventId);

            if (marker) {
                setActiveMarker(marker);
            }

            if (isDesktop()) {
                smoothPanTo(position);
                map.setZoom(14);
            } else {
                lastSelectedPosition = position;
                smoothPanTo(position, 300, () => {
                    // After centering, pan the map so the pin is centered in the *visible* map area,
                    // Only zoom in if the map is currently zoomed out too far.
                    if (map.getZoom() < 13) {
                        map.setZoom(13);
                    }
                    // accounting for the detail panel that slides up from the bottom.
                    const mapHeight = mapElement.offsetHeight;
                    const detailPanelHeight = detailPanel.offsetHeight;
                    const overlap = (mapHeight + detailPanelHeight) - window.innerHeight;
                    const panOffset = overlap > 0 ? overlap / 2 : 0;
                    map.panBy(0, panOffset);
                });
            }
        }
        detailTitle.textContent = event.title;

        let imageHtml = '';
        if (event.photos && event.photos.length > 0) {
            const slidesHtml = event.photos.map(photoUrl =>
                `<div class="slider-slide" style="background-image: url('${photoUrl}');"></div>`
            ).join('');

            const dotsHtml = event.photos.length > 1 ? event.photos.map((_, index) =>
                `<span class="slider-dot ${index === 0 ? 'active' : ''}" data-slide-index="${index}"></span>`
            ).join('') : '';

            imageHtml = `
                <div class="image-slider detail-slider">
                    <div class="slider-inner">${slidesHtml}</div>
                    <button class="slider-btn prev" aria-label="Previous image">&lt;</button>
                    <button class="slider-btn next" aria-label="Next image">&gt;</button>
                    <div class="slider-dots">${dotsHtml}</div>
                </div>`;
        }

        const saleTypePill = event.sale_type_details ? `<span class="mini-pill sale-type-pill-mini">${event.sale_type_details.name}</span>` : '';
        const categoryPills = (event.item_category_details || []).map(category => {
            return category ? `<span class="mini-pill">${category.name}</span>` : '';
        }).join('');
        const directionsButtonHtml = userLocationMarker ? `
                    <button id="directions-btn" class="directions-btn" title="Get Directions">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                    </button>
                ` : '';

        detailContent.innerHTML = `
                    ${imageHtml}
                    <div style="padding: 0 5px;">
                        <p><strong>When:</strong> ${formatEventDate(event.start_datetime, event.end_datetime)}</p>
                        <div class="address-container">
                            <div>
                                <p><strong>Where:</strong> <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}" target="_blank" rel="noopener noreferrer" class="address-link">${event.address}</a></p>
                                ${event.latitude && event.longitude ? `<p style="font-size: 0.8rem; color: #666; margin-top: 4px;">(${event.latitude.toFixed(5)}, ${event.longitude.toFixed(5)})</p>` : ''}
                            </div>
                            ${directionsButtonHtml}
                        </div>
                        <p>${event.description}</p>
                        <div class="mini-pills-container" style="margin-top: 15px;">${saleTypePill}${categoryPills}</div>
                        <div class="detail-actions">
                            <button id="add-to-calendar-btn" title="Add to Calendar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                <span>Calendar</span>
                            </button>
                            <button id="share-event-btn" title="Share Event">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                                <span>Share</span>
                            </button>
                            <button id="report-event-btn" title="Report Event">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                                <span>Report</span>
                            </button>
                        </div>
                    </div>
                `;

        // Set up the slider after the HTML is in the DOM
        setupImageSlider(detailContent.querySelector('.detail-slider'));

        const directionsBtn = document.getElementById('directions-btn');
        if (directionsBtn) {
            directionsBtn.addEventListener('click', () => {
                const userPos = getMarkerPosition(userLocationMarker);
                const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userPos.lat},${userPos.lng}&destination=${encodeURIComponent(event.address)}`;
                window.open(directionsUrl, '_blank');
            });
        }

        document.getElementById('report-event-btn').addEventListener('click', () => openReportModal(event));
        document.getElementById('add-to-calendar-btn').addEventListener('click', () => handleAddToCalendar(event));
        document.getElementById('share-event-btn').addEventListener('click', () => shareEvent(event));

        if (!isDesktop()) {
            listPanel.classList.add('detail-open');
        }
        detailPanel.classList.add('open');
        detailPanel.setAttribute('aria-hidden', 'false');
        listPanel.setAttribute('aria-hidden', 'true');

        // Move focus to the panel after the transition
        setTimeout(() => {
            detailBackButton.focus();
        }, 400); // Should match CSS transition duration
    }

    function handleAddToCalendar(event) {
        const formatIcsDate = (date) => {
            if (!(date instanceof Date) || isNaN(date)) return '';
            // Format to YYYYMMDDTHHMMSSZ
            return date.toISOString().replace(/-|:|\.\d{3}/g, '');
        };

        const startDate = new Date(event.start_datetime);
        const endDate = new Date(event.end_datetime);

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//GarageSaleMap//EN',
            'BEGIN:VEVENT',
            `UID:${event.id}@garagesalemap.com`,
            `DTSTAMP:${formatIcsDate(new Date())}`,
            `DTSTART:${formatIcsDate(startDate)}`,
            `DTEND:${formatIcsDate(endDate)}`,
            `SUMMARY:${event.title}`,
            `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
            `LOCATION:${event.address}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function shareEvent(event) {
        const eventUrl = `${window.location.origin}${window.location.pathname}?event=${event.id}`;
        const shareData = {
            title: `Garage Sale: ${event.title}`,
            text: `Check out this garage sale: ${event.description.substring(0, 100)}...`,
            url: eventUrl,
        };

        if (navigator.share) {
            navigator.share(shareData).catch((error) => console.error('Error sharing event:', error));
        } else {
            navigator.clipboard.writeText(eventUrl).then(() => {
                const shareBtn = document.getElementById('share-event-btn');
                if (shareBtn) {
                    const originalContent = shareBtn.innerHTML;
                    shareBtn.innerHTML = 'Link Copied!';
                    shareBtn.disabled = true;
                    setTimeout(() => {
                        shareBtn.innerHTML = originalContent;
                        shareBtn.disabled = false;
                    }, 2000);
                }
            }).catch(err => {
                console.error('Failed to copy event link: ', err);
                alert('Could not copy link to clipboard.');
            });
        }
    }

    function populateSubmissionForm() {
        // Populate sale types
        eventSaleTypePillsContainer.innerHTML = '';
        allSaleTypes.forEach(type => {
            const pill = document.createElement('div');
            pill.className = 'filter-pill'; // Reuse existing pill style
            pill.textContent = type.name;
            pill.dataset.saleTypeId = type.id;
            eventSaleTypePillsContainer.appendChild(pill);
        });

        // Populate categories
        eventCategoriesContainer.innerHTML = '';
        if (allCategories.length > 0) {
            allCategories.forEach(category => {
                const checkboxId = `category-checkbox-${category.id}`;

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.name = 'item_categories';
                checkbox.value = category.id;
                checkbox.id = checkboxId;

                const label = document.createElement('label');
                label.htmlFor = checkboxId;
                label.textContent = category.name;

                eventCategoriesContainer.appendChild(checkbox);
                eventCategoriesContainer.appendChild(label);
            });
        }
    }

    function closeDetailPanel() {
        if (!isDesktop()) {
            listPanel.classList.remove('detail-open');
        }
        detailPanel.classList.remove('open');
        detailPanel.setAttribute('aria-hidden', 'true');
        listPanel.setAttribute('aria-hidden', 'false');

        // On mobile, pan back to the actual center of the last selected marker
        if (!isDesktop() && lastSelectedPosition) {
            smoothPanTo(lastSelectedPosition);
            lastSelectedPosition = null; // Clear after use
        }

        // Deactivate any highlighted marker
        setActiveMarker(null);
        currentlySelectedEventForDebug = null;
        updateDebugOverlay();

        // Return focus to the element that opened the panel
        if (elementThatOpenedDetailPanel) {
            elementThatOpenedDetailPanel.focus();
            elementThatOpenedDetailPanel = null;
        }
    }

    function loadAndApplyFilters() {
        const savedFiltersJSON = localStorage.getItem('eventFilters');
        if (!savedFiltersJSON) return;

        try {
            const savedFilters = JSON.parse(savedFiltersJSON);

            // Apply search term
            if (savedFilters.search) {
                searchInput.value = savedFilters.search;
            }

            // Apply sale type pill
            if (savedFilters.saleType) {
                document.querySelectorAll('.sale-type-pill').forEach(p => p.classList.remove('active'));
                const pillToActivate = document.querySelector(`.sale-type-pill[data-sale-type="${savedFilters.saleType}"]`);
                pillToActivate ? pillToActivate.classList.add('active') : document.querySelector('.sale-type-pill[data-sale-type="all"]').classList.add('active');
            }

            // Apply category pill
            if (savedFilters.category) {
                document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
                const pillToActivate = document.querySelector(`.category-pill[data-category="${savedFilters.category}"]`);
                pillToActivate ? pillToActivate.classList.add('active') : document.querySelector('.category-pill[data-category="all"]').classList.add('active');
            }
        } catch (e) {
            console.error("Failed to parse saved filters from localStorage", e);
            // If parsing fails, clear the corrupted data
            localStorage.removeItem('eventFilters');
        }
    }

    function clearAllFilters() {
        // Reset search
        searchInput.value = '';

        // Reset sale type pills
        document.querySelectorAll('.sale-type-pill').forEach(p => p.classList.remove('active'));
        const allSaleTypePill = document.querySelector('.sale-type-pill[data-sale-type="all"]');
        if (allSaleTypePill) {
            allSaleTypePill.classList.add('active');
            allSaleTypePill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }

        // Reset category pills
        document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
        const allCategoryPill = document.querySelector('.category-pill[data-category="all"]');
        if (allCategoryPill) {
            allCategoryPill.classList.add('active');
            allCategoryPill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }

        // Re-run the filter and display logic
        filterAndDisplayEvents();
    }

    function scrollToEventCard(eventId) {
        const cardToScrollTo = eventsContainer.querySelector(`.card[data-event-id='${eventId}']`);
        if (cardToScrollTo) {
            cardToScrollTo.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }

    function formatEventDate(startStr, endStr) {
        if (!startStr || !endStr) {
            return 'Date not available';
        }

        const startDate = new Date(startStr);
        const endDate = new Date(endStr);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return 'Invalid date format';
        }

        const now = new Date();
        const isToday = startDate.getFullYear() === now.getFullYear() &&
            startDate.getMonth() === now.getMonth() &&
            startDate.getDate() === now.getDate();

        const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
        const startTime = startDate.toLocaleTimeString('en-US', timeOptions).replace(' ', '');
        const endTime = endDate.toLocaleTimeString('en-US', timeOptions).replace(' ', '');

        if (isToday) {
            return `Today from ${startTime} to ${endTime}`;
        }

        const dayOptions = { weekday: 'long', month: 'long', day: 'numeric' };
        const day = startDate.getDate();
        let suffix = 'th';
        if (day % 10 === 1 && day % 100 !== 11) suffix = 'st';
        if (day % 10 === 2 && day % 100 !== 12) suffix = 'nd';
        if (day % 10 === 3 && day % 100 !== 13) suffix = 'rd';

        // Intl.DateTimeFormat is more robust for this
        const formatter = new Intl.DateTimeFormat('en-US', dayOptions);
        const parts = formatter.formatToParts(startDate);
        const weekday = parts.find(p => p.type === 'weekday').value;
        const month = parts.find(p => p.type === 'month').value;

        return `${weekday} ${month} ${day}${suffix}`;
    }

    function getFilteredEvents() {
        const selectedSaleType = document.querySelector('.sale-type-pill.active')?.dataset.saleType || 'all';
        const selectedCategory = document.querySelector('.category-pill.active')?.dataset.category || 'all';
        const searchTerm = searchInput.value.toLowerCase().trim();

        let filtered = allEvents;

        // 1. Apply primary filter (Sale Type or Favorites)
        if (selectedSaleType === 'favorites') {
            const favoriteIds = getFavorites();
            filtered = filtered.filter(event => favoriteIds.includes(event.id));
        } else if (selectedSaleType !== 'all') {
            filtered = filtered.filter(event => event.sale_type_id === parseInt(selectedSaleType));
        }

        // 2. Apply secondary filters (Category and Search) on the result
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(event => event.item_categories && event.item_categories.includes(parseInt(selectedCategory)));
        }
        if (searchTerm) {
            filtered = filtered.filter(event => (event.title && event.title.toLowerCase().includes(searchTerm)) || (event.description && event.description.toLowerCase().includes(searchTerm)));
        }
        return filtered;
    }

    function getActiveFilterCount() {
        const selectedSaleType = document.querySelector('.sale-type-pill.active')?.dataset.saleType || 'all';
        const selectedCategory = document.querySelector('.category-pill.active')?.dataset.category || 'all';
        const searchTerm = searchInput.value.trim();

        let count = 0;
        if (selectedSaleType !== 'all') count++;
        if (selectedCategory !== 'all') count++;
        if (searchTerm.length > 0) count++;

        return count;
    }

    function updateClearFiltersButton() {
        const count = getActiveFilterCount();
        if (count > 0) {
            clearAllFiltersBtn.textContent = `Clear ${count} Filter${count > 1 ? 's' : ''}`;
            clearFiltersWrapper.style.display = 'flex';
        } else {
            clearFiltersWrapper.style.display = 'none';
        }
    }

    function updateDebugOverlay() {
        const contentEl = document.getElementById('debug-content');
        if (!contentEl) return;

        const filteredEvents = getFilteredEvents();

        let selectedEventHtml = '<strong>Selected Event:</strong><p style="margin:0;">None</p>';
        if (currentlySelectedEventForDebug) {
            selectedEventHtml = `
                        <strong>Selected Event Details:</strong>
                        <pre style="white-space: pre-wrap; word-break: break-all; font-size: 11px; margin: 5px 0 0; background-color: rgba(0,0,0,0.2); padding: 5px; border-radius: 3px;">${JSON.stringify(currentlySelectedEventForDebug, null, 2)}</pre>
                    `;
        }

        contentEl.innerHTML = `
                    <strong>Zoom Level:</strong> ${map.getZoom()}<br>
                    <strong>Clustering:</strong> ${clusteringToggle.checked ? 'On' : 'Off'}<br>
                    <strong>Total Events:</strong> ${allEvents.length}<br>
                    <strong>Filtered Events:</strong> ${filteredEvents.length}<br>
                    <strong>Pin Count:</strong> ${allMarkers.length}<br>
                    <hr style="margin: 5px 0;">
                    ${selectedEventHtml}
                `;
    }

    function filterAndDisplayEvents() {
        const selectedSaleType = document.querySelector('.sale-type-pill.active')?.dataset.saleType || 'all';
        const selectedCategory = document.querySelector('.category-pill.active')?.dataset.category || 'all';
        const searchTerm = searchInput.value.toLowerCase().trim();

        // Save current filters to localStorage
        const filtersToSave = {
            saleType: selectedSaleType,
            category: selectedCategory,
            search: searchTerm
        };
        localStorage.setItem('eventFilters', JSON.stringify(filtersToSave));

        updateClearFiltersButton();

        // Update active pills
        document.querySelectorAll('.sale-type-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.saleType === selectedSaleType);
        });
        document.querySelectorAll('.category-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.category === selectedCategory);
        });

        // Clear existing markers from the map
        if (markerCluster) {
            markerCluster.clearMarkers();
            markerCluster = null;
        }
        allMarkers.forEach(marker => marker.setMap(null));
        allMarkers = [];

        // Filter events
        const filteredEvents = getFilteredEvents();

        // Clear and re-populate list
        eventsContainer.innerHTML = '';
        if (filteredEvents.length === 0) {
            eventsContainer.innerHTML = `
                        <div class="no-results-container">
                            <p>No events match your current filters.</p>
                            <button class="clear-filters-btn">Clear All Filters</button>
                        </div>`;
            eventsContainer.querySelector('.clear-filters-btn').addEventListener('click', clearAllFilters);
            // Hide the primary "Clear X Filters" button to avoid duplication.
            clearFiltersWrapper.style.display = 'none';
            return;
        }

        const bounds = new google.maps.LatLngBounds();

        if (userLocationMarker) {
            const userPos = getMarkerPosition(userLocationMarker);
            if (userPos) bounds.extend(userPos);
        }

        const useClustering = clusteringToggle.checked;
        filteredEvents.forEach(event => {
            // Add event card to list
            const card = createEventCard(event);
            card.addEventListener('click', () => openDetailPanel(event.id));
            eventsContainer.appendChild(card);

            // Add marker to map
            if (event.latitude && event.longitude) {
                const position = { lat: event.latitude, lng: event.longitude };
                let marker;

                const pin = new PinElement();
                marker = new AdvancedMarkerElement({
                    map: useClustering ? null : map,
                    position: position,
                    title: event.title,
                    content: pin.element,
                });
                marker.defaultContent = pin.element; // Store for hover/active state changes

                marker.addListener('click', () => {
                    openDetailPanel(event.id);
                    scrollToEventCard(event.id);
                });
                marker.eventId = event.id;
                allMarkers.push(marker);

                bounds.extend(position);
            }
        });

        if (useClustering) {
            const onClusterClickHandler = (_event, cluster, map) => {
                if (cluster.bounds) {
                    map.fitBounds(cluster.bounds, 60); // Add padding for better visibility
                }
            };
            markerCluster = new markerClusterer.MarkerClusterer({
                markers: allMarkers,
                map: map,
                onClusterClick: onClusterClickHandler,
                renderer: new CustomClusterRenderer(),
            });
        }
        
        // Adjust map view based on the new bounds
        if (!bounds.isEmpty()) {
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();

            if (ne.equals(sw)) {
                // If there's only a single point, center on it with a fixed zoom.
                const defaultZoom = parseInt(localStorage.getItem(ZOOM_LEVEL_KEY) || '14', 10);
                map.setCenter(ne);
                map.setZoom(defaultZoom);
            } else {
                // Only fit the bounds automatically if a filter is active.
                // On initial load, this respects the user's default zoom setting.
                if (getActiveFilterCount() > 0) {
                    map.fitBounds(bounds, 150);
                }
                // On mobile, prevent zooming out too far after filtering.
                if (!isDesktop()) {
                    google.maps.event.addListenerOnce(map, 'idle', () => {
                        if (map.getZoom() < 13) {
                            map.setZoom(13);
                        }
                    });
                }
            }
        }
        updateDebugOverlay();
    }

    async function refreshEvents() {
        const refreshIcon = refreshEventsBtn.querySelector('svg');
        refreshEventsBtn.disabled = true;
        if (refreshIcon) {
            refreshIcon.style.animation = 'spin 1s linear infinite';
        }

        try {
            const response = await fetch(eventsApiUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch updated events.');
            }
            const newEvents = await response.json();
            allEvents = newEvents;
            allEvents.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
            filterAndDisplayEvents();
        } catch (error) {
            console.error('Error refreshing events:', error);
            alert(error.message);
        } finally {
            setTimeout(() => {
                refreshEventsBtn.disabled = false;
                if (refreshIcon) {
                    refreshIcon.style.animation = '';
                }
            }, 500);
        }
    }


    // --- API and Map Logic ---
    const eventsApiUrl = '/api/events';
    const categoriesApiUrl = '/api/item_categories';
    const saleTypesApiUrl = '/api/sale_types';
    let map;

    async function initMap() {
        const { Map } = await google.maps.importLibrary("maps");
        const markerLibrary = await google.maps.importLibrary("marker");
        AdvancedMarkerElement = markerLibrary.AdvancedMarkerElement;
        PinElement = markerLibrary.PinElement;
        const { Autocomplete } = await google.maps.importLibrary("places");
        clusterInfoWindow = new google.maps.InfoWindow({
            content: '',
            disableAutoPan: true,
            ariaLabel: "Cluster Preview",
            disableCloseButton: true,
            pixelOffset: new google.maps.Size(0, 25)
        });

        const defaultZoom = parseInt(localStorage.getItem(ZOOM_LEVEL_KEY) || '12', 10);
        map = new Map(document.getElementById('map'), {
            center: { lat: 45.345, lng: -75.760 }, // Default to Ottawa
            zoom: defaultZoom,
            mapId: 'GAPI_MAP_ID', // This is required for Advanced Markers
            disableDefaultUI: true
        });

        highlightedPinElement = new PinElement({
            background: '#007AFF', // A nice, standout blue
            borderColor: '#ffffff',
            glyphColor: '#ffffff',
            scale: 1.3, // Make it slightly larger than default
        }).element;

        // Load and apply saved map type preference
        const savedMapType = localStorage.getItem(MAP_TYPE_KEY) || 'roadmap';
        map.setMapTypeId(savedMapType);
        const radioToCheck = document.querySelector(`input[name="map-type"][value="${savedMapType}"]`);
        if (radioToCheck) {
            radioToCheck.checked = true;
        }

        // --- Initialize Places Autocomplete for the submission form ---
        const eventAddressInput = document.getElementById('event-address');
        const autocomplete = new Autocomplete(eventAddressInput, {
            types: ['address'],
            componentRestrictions: { 'country': 'ca' }, // Bias to Canada
            fields: ['formatted_address', 'geometry'] // Request only needed data
        });
        autocomplete.bindTo('bounds', map);

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry && place.geometry.location) {
                submissionCoordinates = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                };
                // Manually trigger validation to clear the error message if it exists
                validateForm();
            } else {
                submissionCoordinates = null;
            }
        });

        eventAddressInput.addEventListener('input', () => {
            submissionCoordinates = null;
        });

        // --- Map Interaction Listeners to disable 'follow me' mode ---
        const stopFollowing = () => {
            if (isFollowingUser) {
                isFollowingUser = false;
                centerLocationButton.classList.remove('following');
            }
        };
        map.addListener('dragstart', stopFollowing);
        mapElement.addEventListener('wheel', stopFollowing, { passive: true });
        mapElement.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) { // Detect pinch-to-zoom
                stopFollowing();
            }
        }, { passive: true });

        map.addListener('zoom_changed', () => {
            updateDebugOverlay();
        });

        // Add user location tracking
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(position => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                if (userLocationMarker) {
                    userLocationMarker.position = pos;
                } else {
                    const dot = document.createElement('div');
                    dot.className = 'user-location-dot';
                    userLocationMarker = new AdvancedMarkerElement({
                        map: map,
                        position: pos,
                        content: dot,
                        title: 'Your Location',
                        zIndex: google.maps.Marker.MAX_ZINDEX + 1 // Ensures it's always on top
                    });
                    // Initially, don't follow, just center once.
                    smoothPanTo(pos, 300, () => map.setZoom(15));
                }

                if (isFollowingUser) {
                    smoothPanTo(pos);
                }
            }, () => {
                // Handle location error
                console.log("Error: The Geolocation service failed.");
            }, {
                enableHighAccuracy: true
            });
        } else {
            // Browser doesn't support Geolocation
            console.log("Error: Your browser doesn't support geolocation.");
        }

        // Fetch categories and sale types, then events
        Promise.all([
            fetch(saleTypesApiUrl).then(res => res.json()),
            fetch(categoriesApiUrl).then(res => res.json()),
            fetch(eventsApiUrl).then(res => res.json())
        ]).then(([saleTypes, categories, events]) => {
            allSaleTypes = saleTypes;
            allCategories = categories;
            allEvents = events;

            // Populate the submission form dropdowns now that we have the data
            populateSubmissionForm();

            // "All" sale type pill
            const allSaleTypePill = document.createElement('div');
            allSaleTypePill.className = 'filter-pill sale-type-pill active';
            allSaleTypePill.textContent = 'All Sale Types';
            allSaleTypePill.dataset.saleType = 'all';
            allSaleTypePill.addEventListener('click', () => {
                document.querySelectorAll('.sale-type-pill').forEach(p => p.classList.remove('active'));
                allSaleTypePill.classList.add('active');
                filterAndDisplayEvents();
            });
            saleTypePillsContainer.appendChild(allSaleTypePill);

            // "Favorites" pill
            const favoritesPill = document.createElement('div');
            favoritesPill.className = 'filter-pill sale-type-pill';
            favoritesPill.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>Favorites`;
            favoritesPill.dataset.saleType = 'favorites';
            favoritesPill.addEventListener('click', () => {
                document.querySelectorAll('.sale-type-pill').forEach(p => p.classList.remove('active'));
                favoritesPill.classList.add('active');
                filterAndDisplayEvents();
            });
            saleTypePillsContainer.appendChild(favoritesPill);

            // Sale type pills
            saleTypes.forEach(saleType => {
                const pill = document.createElement('div');
                pill.className = 'filter-pill sale-type-pill';
                pill.textContent = saleType.name;
                pill.dataset.saleType = saleType.id;
                pill.addEventListener('click', () => {
                    document.querySelectorAll('.sale-type-pill').forEach(p => p.classList.remove('active'));
                    pill.classList.add('active');
                    filterAndDisplayEvents();
                });
                saleTypePillsContainer.appendChild(pill);
            });

            // "All" category pill
            const allCategoryPill = document.createElement('div');
            allCategoryPill.className = 'filter-pill category-pill active';
            allCategoryPill.textContent = 'All Categories';
            allCategoryPill.dataset.category = 'all';
            allCategoryPill.addEventListener('click', () => {
                document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
                allCategoryPill.classList.add('active');
                filterAndDisplayEvents();
            });
            categoryPillsContainer.appendChild(allCategoryPill);

            // Category pills
            categories.forEach(category => {
                const pill = document.createElement('div');
                pill.className = 'filter-pill category-pill';
                pill.textContent = category.name;
                pill.dataset.category = category.id;
                pill.addEventListener('click', () => {
                    document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
                    pill.classList.add('active');
                    filterAndDisplayEvents();
                });
                categoryPillsContainer.appendChild(pill);
            });

            // Load and apply filters from localStorage before the first render
            loadAndApplyFilters();

            events.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
            filterAndDisplayEvents(); // Display all events initially
            updateDebugOverlay();
            loadingOverlay.classList.add('hidden');

            // Handle deep-linking from a shared URL
            if (eventIdFromUrl) {
                const eventToOpen = allEvents.find(e => e.id == eventIdFromUrl);
                if (eventToOpen) {
                    setTimeout(() => {
                        openDetailPanel(eventToOpen.id);
                        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
                    }, 500);
                }
            }
        })
            .catch(error => {
                console.error('Error fetching data:', error);
                eventsContainer.innerHTML = `<p class="error-message">Could not load events.</p>`;
                loadingOverlay.classList.add('hidden');
            });
    }

    function smoothPanTo(position, duration = 300, callback) {
        const start = {
            lat: map.getCenter().lat(),
            lng: map.getCenter().lng()
        };
        const end = {
            lat: position.lat,
            lng: position.lng
        };

        let startTime = null;

        function animate(currentTime) {
            if (startTime === null) {
                startTime = currentTime;
            }

            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);

            const lat = start.lat + (end.lat - start.lat) * progress;
            const lng = start.lng + (end.lng - start.lng) * progress;

            map.setCenter({ lat, lng });

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                if (callback) callback();
            }
        }

        requestAnimationFrame(animate);
    }

    function getMarkerPosition(marker) {
        if (!marker) return null;
        // Advanced Marker has a .position property which can be a LatLng or LatLngLiteral
        if (marker.position) {
            const pos = marker.position;
            // Check if it's a LatLng object with lat() and lng() methods
            if (typeof pos.lat === 'function') {
                return { lat: pos.lat(), lng: pos.lng() };
            }
            return pos; // It's already a LatLngLiteral
        }
        return null;
    }
    function createEventCard(event) {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.eventId = event.id;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `View details for ${event.title}`);

        const favoriteButtonHtml = `
                    <button class="favorite-btn ${isFavorite(event.id) ? 'active' : ''}" aria-label="Toggle favorite">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    </button>
                `;

        let imageHtml = '';
        if (event.photos && event.photos.length > 0) {
            const slidesHtml = event.photos.map(photoUrl =>
                `<div class="slider-slide" style="background-image: url('${photoUrl}');"></div>`
            ).join('');

            const dotsHtml = event.photos.length > 1 ? event.photos.map((_, index) =>
                `<span class="slider-dot ${index === 0 ? 'active' : ''}" data-slide-index="${index}"></span>`
            ).join('') : '';

            imageHtml = `
                <div class="image-slider card-slider">
                    <div class="slider-inner">${slidesHtml}</div>
                    <button class="slider-btn prev" aria-label="Previous image">&lt;</button>
                    <button class="slider-btn next" aria-label="Next image">&gt;</button>
                    <div class="slider-dots">${dotsHtml}</div>
                </div>`;
        }

        const saleTypePill = event.sale_type_details ? `<span class="mini-pill sale-type-pill-mini">${event.sale_type_details.name}</span>` : '';
        const categoryPills = (event.item_category_details || []).map(category => {
            return category ? `<span class="mini-pill">${category.name}</span>` : '';
        }).join('');

        card.innerHTML = `
                    ${favoriteButtonHtml}
                    ${imageHtml}
                    <div class="card-body">
                        <div class="card-content">
                            <h2 class="card-title">${event.title}</h2>
                            <p class="card-description">${event.description.substring(0, 100)}...</p>
                            <div class="mini-pills-container">${saleTypePill}${categoryPills}</div>
                        </div>
                        <div class="card-chevron">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </div>
                    </div>
                `;

        // Set up the slider after the HTML is in the DOM
        setupImageSlider(card.querySelector('.card-slider'));

        const favBtn = card.querySelector('.favorite-btn');
        if (favBtn) {
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click from firing
                toggleFavorite(event.id);
            });
        }

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); // Prevent spacebar from scrolling
                openDetailPanel(event.id);
            }
        });

        card.addEventListener('mouseenter', () => {
            const marker = allMarkers.find(m => m.eventId === event.id);
            if (marker) {
                setHoveredMarker(marker);
            }
        });

        card.addEventListener('mouseleave', () => {
            clearHoveredMarker();
        });

        return card;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBA5gWJDCdQIvqWXdtMN6aWJg2h5rLiikU&callback=initMap&libraries=marker,places`;
    script.async = true;
    script.defer = true;
    window.initMap = initMap;
    document.head.appendChild(script);

    // --- Accessibility: Close modal on Escape key ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && detailPanel.classList.contains('open')) {
            closeDetailPanel();
        }
    });

    // --- Accessibility: Trap focus within the detail panel ---
    detailPanel.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab' || !detailPanel.classList.contains('open')) return;

        const focusableElements = Array.from(detailPanel.querySelectorAll(
            'a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled])'
        )).filter(el => el.offsetParent !== null); // Check for visibility

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const isShiftPressed = e.shiftKey;

        if (!isShiftPressed && document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
        }

        if (isShiftPressed && document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
        }
    });
}); 