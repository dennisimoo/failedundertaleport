/**
 * Undertale Web Port - Simple Save System
 * This file handles saving and loading game data using IndexedDB
 */

// Constants for IndexedDB
const DB_NAME = '/_savedata';
const DB_VERSION = 21;
const OBJECT_STORE_NAME = 'FILE_DATA';
const SAVE_FILE_PATH = '/_savedata/';

// Global variable to track if the database is initialized
let dbInitialized = false;

// Initialize IndexedDB for save functionality
window.initSaveDatabase = function(callback) {
    // If already initialized, just call the callback
    if (dbInitialized && callback) {
        console.log('Database already initialized');
        callback(null);
        return;
    }
    
    console.log('Initializing IndexedDB database');
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = function(event) {
        const db = event.target.result;
        // Create the object store if it doesn't exist
        if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
            db.createObjectStore(OBJECT_STORE_NAME);
            console.log('Created IndexedDB object store: ' + OBJECT_STORE_NAME);
        }
    };
    
    request.onsuccess = function(event) {
        console.log('Successfully opened IndexedDB database');
        dbInitialized = true;
        if (callback) callback(null, event.target.result);
    };
    
    request.onerror = function(event) {
        console.error('Failed to open IndexedDB:', event.target.error);
        if (callback) callback(event.target.error);
    };
};

// Function to download ALL data from IndexedDB
window.downloadSaveDirectly = function() {
    try {
        console.log('[Save Debug] Starting download process - CORRECT DATABASE NAME (/_savedata)');
        window.showSaveStatus('Info', 'Preparing all IndexedDB data for download...');
        
        // CORRECT APPROACH: Access using /_savedata database with FILE_DATA store
        // The key insight from user's screenshot is that the database name is /_savedata
        console.log('[Save Debug] Opening /_savedata database with correct name');
        const request = indexedDB.open('/_savedata', 21); // Correct database name with slash
        
        request.onerror = function(event) {
            console.error('[Save Debug] Failed to open /_savedata database:', event.target.error);
            window.showSaveStatus('Error', 'Failed to open IndexedDB: ' + event.target.error);
        };
        
        request.onsuccess = function(event) {
            const db = event.target.result;
            console.log('[Save Debug] Successfully opened /_savedata database');
            console.log('[Save Debug] Available object stores:', Array.from(db.objectStoreNames));
            
            if (!db.objectStoreNames.contains('FILE_DATA')) {
                console.error('[Save Debug] FILE_DATA store not found in /_savedata database');
                window.showSaveStatus('Error', 'No FILE_DATA store found in database');
                return;
            }
            
            try {
                // Get save data from FILE_DATA store
                const transaction = db.transaction(['FILE_DATA'], 'readonly');
                const objectStore = transaction.objectStore('FILE_DATA');
                const allData = {};
                let recordCount = 0;
                
                console.log('[Save Debug] Getting all Undertale save files from IndexedDB');
                
                // First, let's dump all keys to console for debugging as suggested by the user
                console.log('[Save Debug] Starting cursor to dump all keys for debugging');
                const debugCursorRequest = objectStore.openCursor();
                debugCursorRequest.onsuccess = function(event) {
                    const cursor = event.target.result;
                    if (cursor) {
                        console.log('[Save Debug] Found key:', cursor.key);
                        console.log('[Save Debug] Value type:', typeof cursor.value);
                        cursor.continue();
                    } else {
                        console.log('[Save Debug] Done listing all keys.');
                    }
                };

                // Direct access to known save file keys based on user's screenshot
                const saveKeys = [
                    '/_savedata/file0',
                    '/_savedata/file9', 
                    '/_savedata/undertale.ini',
                    '/_savedata/decomp_vars.ini',
                    '/_savedata/trophies.ini'
                ];
                
                // Process keys one by one
                function processNextKey(index) {
                    if (index >= saveKeys.length) {
                        if (recordCount > 0) {
                            createDownload(allData, recordCount);
                        } else {
                            // If no save files found with direct key access, try cursor approach
                            console.log('[Save Debug] No save files found with direct key access, trying cursor approach');
                            const cursorRequest = objectStore.openCursor();
                            
                            cursorRequest.onsuccess = function(event) {
                                const cursor = event.target.result;
                                if (cursor) {
                                    console.log('[Save Debug] Processing record with key:', cursor.key);
                                    try {
                                        // Process the record
                                        let data;
                                        if (cursor.value instanceof ArrayBuffer) {
                                            data = Array.from(new Uint8Array(cursor.value));
                                        } else {
                                            data = cursor.value;
                                        }
                                        
                                        allData[cursor.key] = {
                                            data: data,
                                            type: 'binary'
                                        };
                                        recordCount++;
                                    } catch (e) {
                                        console.error('[Save Debug] Error processing record:', e);
                                    }
                                    cursor.continue();
                                } else {
                                    // Done with cursor
                                    if (recordCount > 0) {
                                        createDownload(allData, recordCount);
                                    } else {
                                        console.warn('[Save Debug] No data found in database');
                                        window.showSaveStatus('Error', 'No save files found. Try playing the game and saving first.');
                                    }
                                }
                            };
                            
                            cursorRequest.onerror = function(event) {
                                console.error('[Save Debug] Cursor error:', event.target.error);
                                window.showSaveStatus('Error', 'Failed to read IndexedDB data: ' + event.target.error);
                            };
                        }
                        return;
                    }
                    
                    const key = saveKeys[index];
                    console.log('[Save Debug] Checking for save file:', key);
                    
                    const getRequest = objectStore.get(key);
                    
                    getRequest.onsuccess = function(event) {
                        const result = event.target.result;
                        if (result) {
                            console.log('[Save Debug] Found save file:', key);
                            try {
                                // Log the type of data for debugging
                                console.log('[Save Debug] Save file data type:', typeof result, result instanceof ArrayBuffer, result);
                                
                                // SUPER DETAILED DEBUGGING - Track exactly what data we're getting
                                console.log('[Save Debug] Raw result object for key ' + key + ':', result);
                                if (result && typeof result === 'object') {
                                    console.log('[Save Debug] Object properties:', Object.keys(result));
                                    if (result.contents) {
                                        console.log('[Save Debug] Contents type:', typeof result.contents);
                                        console.log('[Save Debug] Is ArrayBuffer?', result.contents instanceof ArrayBuffer);
                                        console.log('[Save Debug] Is Int8Array?', result.contents instanceof Int8Array);
                                        console.log('[Save Debug] Is Uint8Array?', result.contents instanceof Uint8Array);
                                        console.log('[Save Debug] Contents length:', result.contents.length || 'unknown');
                                        if (result.contents.buffer) {
                                            console.log('[Save Debug] Buffer size:', result.contents.buffer.byteLength);
                                        }
                                    }
                                }
                                
                                // Extract the actual save data from the nested structure
                                let fileData;
                                
                                // Check if it's an object with a contents property
                                if (result && typeof result === 'object' && result.contents) {
                                    console.log('[Save Debug] Processing save object with contents property');
                                    // Extract the contents (which should be an Int8Array or Uint8Array)
                                    if (result.contents instanceof Int8Array || result.contents instanceof Uint8Array) {
                                        // Get a true copy of the array data, not just a reference
                                        if (result.contents.length > 0) {
                                            // Important: Make sure we're actually copying all the array data
                                            fileData = Array.from(result.contents);
                                            console.log('[Save Debug] Successfully extracted array data, length:', fileData.length, 'first 10 bytes:', fileData.slice(0, 10));
                                        } else {
                                            console.warn('[Save Debug] Contents array is empty! May need to play game first.');
                                            fileData = [];
                                        }
                                    } else if (typeof result.contents === 'object') {
                                        // Handle case where contents is a regular object but not a typed array
                                        console.log('[Save Debug] Contents is an object but not a typed array');
                                        if (Object.keys(result.contents).length > 0) {
                                            // Try to convert object to array if it has numeric keys
                                            const tempArray = [];
                                            let hasNumericKeys = false;
                                            
                                            for (const key in result.contents) {
                                                if (!isNaN(parseInt(key))) {
                                                    hasNumericKeys = true;
                                                    tempArray[parseInt(key)] = result.contents[key];
                                                }
                                            }
                                            
                                            if (hasNumericKeys) {
                                                fileData = tempArray;
                                                console.log('[Save Debug] Converted object with numeric keys to array, length:', fileData.length);
                                            } else {
                                                // If it doesn't have numeric keys, store it as JSON
                                                fileData = JSON.stringify(result.contents);
                                                console.log('[Save Debug] Converted object to JSON string, length:', fileData.length);
                                            }
                                        } else {
                                            console.warn('[Save Debug] Contents object is empty');
                                            fileData = [];
                                        }
                                    } else {
                                        console.warn('[Save Debug] Contents has unexpected type:', typeof result.contents);
                                        // Try to stringify if possible
                                        try {
                                            fileData = JSON.stringify(result.contents);
                                        } catch (e) {
                                            console.error('[Save Debug] Failed to stringify contents:', e);
                                            fileData = [];
                                        }
                                    }
                                    
                                    // Also save metadata about the file
                                    allData[key + '_metadata'] = {
                                        timestamp: result.timestamp ? result.timestamp.toString() : null,
                                        mode: result.mode
                                    };
                                } else if (result instanceof ArrayBuffer) {
                                    fileData = Array.from(new Uint8Array(result));
                                    console.log('[Save Debug] Converted ArrayBuffer to array, length:', fileData.length);
                                } else if (typeof result === 'string') {
                                    fileData = result; // Keep strings as-is
                                    console.log('[Save Debug] String data found, length:', fileData.length);
                                } else if (Array.isArray(result)) {
                                    fileData = result; // Keep arrays as-is
                                    console.log('[Save Debug] Array data found, length:', fileData.length);
                                } else {
                                    // For objects and other types, stringify to preserve data
                                    fileData = JSON.stringify(result);
                                    console.log('[Save Debug] Converted object to string, length:', fileData.length);
                                }
                                // Make sure we have meaningful data to save
                                if (fileData && (Array.isArray(fileData) ? fileData.length > 0 : true)) {
                                    console.log('[Save Debug] Saving data for key:', key, 'data type:', typeof fileData);
                                    
                                    // Store the actual data in our download structure
                                    allData[key] = {
                                        data: fileData,
                                        type: 'binary'
                                    };
                                    recordCount++;
                                } else {
                                    console.warn('[Save Debug] Skipping empty data for key:', key);
                                }
                            } catch (e) {
                                console.error('[Save Debug] Error processing save file:', e);
                            }
                        } else {
                            console.log('[Save Debug] Save file not found:', key);
                        }
                        
                        processNextKey(index + 1);
                    };
                    
                    getRequest.onerror = function(event) {
                        console.error('[Save Debug] Error accessing save file:', event.target.error);
                        processNextKey(index + 1);
                    };
                }
                
                // Start processing save files
                processNextKey(0);
                
            } catch (e) {
                console.error('[Save Debug] Error accessing object store:', e);
                window.showSaveStatus('Error', 'Failed to access object store: ' + e);
            }
        };
    } catch (e) {
        console.error('[Save Debug] Unexpected error in download process:', e);
        window.showSaveStatus('Error', 'Failed to download IndexedDB data: ' + e);
    }
};

// Helper function to create and trigger the download
function createDownload(allData, recordCount) {
    // Create a JSON blob
    console.log('[Save Debug] Creating JSON blob with', recordCount, 'records');
    
    // DEBUG: Check if any of the data arrays are empty
    let emptyArrayCount = 0;
    let nonEmptyArrayCount = 0;
    for (const key in allData) {
        if (key.endsWith('_metadata')) continue; // Skip metadata entries
        
        const item = allData[key];
        if (item && item.data && Array.isArray(item.data)) {
            if (item.data.length === 0) {
                console.warn('[Save Debug] WARNING: Empty data array for key:', key);
                emptyArrayCount++;
            } else {
                console.log('[Save Debug] Data found for key:', key, 'length:', item.data.length, 'first bytes:', item.data.slice(0, 10));
                nonEmptyArrayCount++;
            }
        }
    }
    console.log('[Save Debug] Download summary: Empty arrays:', emptyArrayCount, 'Non-empty arrays:', nonEmptyArrayCount);
    
    const jsonData = JSON.stringify(allData, null, 2);
    console.log('[Save Debug] JSON data size:', jsonData.length, 'bytes');
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link
    console.log('[Save Debug] Creating download link');
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'undertale_indexeddb_' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        console.log('[Save Debug] Download complete and cleanup finished');
    }, 100);
    
    window.showSaveStatus('Success', `Downloaded ${recordCount} records from IndexedDB successfully!`);
}

// Function to upload ALL data to IndexedDB
window.uploadSaveDirectly = function(files) {
    if (!files || files.length === 0) {
        window.showSaveStatus('Error', 'No file selected for upload.');
        return;
    }
    
    window.showSaveStatus('Info', 'Processing uploaded IndexedDB data...');
    
    window.initSaveDatabase(function(error) {
        if (error) {
            window.showSaveStatus('Error', 'Failed to initialize database: ' + error);
            return;
        }
        
        const file = files[0]; // Only process the first file
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const allData = JSON.parse(e.target.result);
                const keys = Object.keys(allData);
                
                if (keys.length === 0) {
                    window.showSaveStatus('Error', 'The uploaded file does not contain any data.');
                    return;
                }
                
                // Open the database
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                
                request.onerror = function(event) {
                    window.showSaveStatus('Error', 'Failed to open IndexedDB: ' + event.target.error);
                };
                
                request.onsuccess = function(event) {
                    const db = event.target.result;
                    try {
                        const transaction = db.transaction([OBJECT_STORE_NAME], 'readwrite');
                        const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
                        
                        let processed = 0;
                        let successCount = 0;
                        
                        // Process each entry
                        keys.forEach(function(key) {
                            const fileData = allData[key];
                            if (fileData && fileData.data) {
                                console.log('[Save Debug] Processing save data for key:', key);
                                console.log('[Save Debug] Data length:', fileData.data.length);
                                console.log('[Save Debug] Data type:', typeof fileData.data);
                                
                                // Debug log the data to understand what we're working with
                                if (Array.isArray(fileData.data)) {
                                    console.log('[Save Debug] First 20 values:', fileData.data.slice(0, 20));
                                } else if (typeof fileData.data === 'string') {
                                    console.log('[Save Debug] First 100 chars:', fileData.data.substring(0, 100));
                                } else {
                                    console.log('[Save Debug] Data structure:', Object.keys(fileData.data));
                                }
                                
                                // Make sure we have actual data (not an empty array)
                                if (Array.isArray(fileData.data) && fileData.data.length === 0) {
                                    console.warn('[Save Debug] Warning: Empty data array for key', key);
                                }
                                
                                // We need to extract the actual save data from various possible formats
                                let saveObject;
                                
                                try {
                                    // First, check if data is already an array of numbers
                                    if (Array.isArray(fileData.data) && typeof fileData.data[0] === 'number') {
                                        console.log('[Save Debug] Data is already an array of numbers, creating Uint8Array directly');
                                        saveObject = {
                                            timestamp: new Date(),
                                            mode: 33206,
                                            contents: new Uint8Array(fileData.data)
                                        };
                                    } else if (typeof fileData.data === 'string') {
                                        // Try to parse the string data as JSON
                                        try {
                                            console.log('[Save Debug] Attempting to parse string data as JSON');
                                            const parsedData = JSON.parse(fileData.data);
                                            
                                            // Check if parsedData is the save object itself
                                            if (parsedData && parsedData.contents) {
                                                console.log('[Save Debug] Found contents in parsed data');
                                                
                                                // Check if contents is an object with numeric keys (array-like)
                                                let contentsArray;
                                                
                                                if (typeof parsedData.contents === 'object' && !Array.isArray(parsedData.contents)) {
                                                    // Create array from object with numeric keys
                                                    contentsArray = [];
                                                    const keys = Object.keys(parsedData.contents).sort((a, b) => parseInt(a) - parseInt(b));
                                                    for (const key of keys) {
                                                        contentsArray[parseInt(key)] = parsedData.contents[key];
                                                    }
                                                    console.log('[Save Debug] Converted object contents to array, length:', contentsArray.length);
                                                } else if (Array.isArray(parsedData.contents)) {
                                                    // Already an array
                                                    contentsArray = parsedData.contents;
                                                    console.log('[Save Debug] Contents is already an array, length:', contentsArray.length);
                                                } else {
                                                    console.error('[Save Debug] Contents has unexpected type:', typeof parsedData.contents);
                                                    contentsArray = [];
                                                }
                                                
                                                // Create the proper save object structure
                                                saveObject = {
                                                    timestamp: new Date(parsedData.timestamp || Date.now()),
                                                    mode: parsedData.mode || 33206,
                                                    contents: new Uint8Array(contentsArray)
                                                };
                                            } else {
                                                console.warn('[Save Debug] Parsed data does not contain contents property');
                                                // Fallback to empty array
                                                saveObject = {
                                                    timestamp: new Date(),
                                                    mode: 33206,
                                                    contents: new Uint8Array(0)
                                                };
                                            }
                                        } catch (parseError) {
                                            console.error('[Save Debug] Failed to parse string as JSON:', parseError);
                                            // If it's not JSON, try to convert it to a Uint8Array (text file)
                                            const textEncoder = new TextEncoder();
                                            const textData = textEncoder.encode(fileData.data);
                                            console.log('[Save Debug] Encoded text data to Uint8Array, length:', textData.length);
                                            
                                            saveObject = {
                                                timestamp: new Date(),
                                                mode: 33206,
                                                contents: textData
                                            };
                                        }
                                    } else {
                                        // Try to handle other data formats
                                        console.warn('[Save Debug] Unrecognized data format, type:', typeof fileData.data);
                                        saveObject = {
                                            timestamp: new Date(),
                                            mode: 33206,
                                            contents: new Uint8Array(0)
                                        };
                                    }
                                } catch (e) {
                                    console.error('[Save Debug] Error processing save data:', e);
                                    // Fallback to empty array
                                    saveObject = {
                                        timestamp: new Date(),
                                        mode: 33206,
                                        contents: new Uint8Array(0)
                                    };
                                }
                                
                                // Check if we have metadata for this file
                                const metadataKey = key + '_metadata';
                                const metadata = allData[metadataKey];
                                
                                // Update the save object with metadata if available
                                if (metadata) {
                                    saveObject.timestamp = new Date(metadata.timestamp);
                                    saveObject.mode = metadata.mode;
                                }
                                
                                console.log('[Save Debug] Created save object with', saveObject.contents.length, 'bytes of data');
                                console.log('[Save Debug] Save object structure:', 
                                    'timestamp:', saveObject.timestamp,
                                    'mode:', saveObject.mode,
                                    'contents type:', saveObject.contents instanceof Uint8Array,
                                    'contents length:', saveObject.contents.length,
                                    'first few bytes:', Array.from(saveObject.contents.slice(0, 10))
                                );
                                const putRequest = objectStore.put(saveObject, key);
                                
                                putRequest.onsuccess = function() {
                                    processed++;
                                    successCount++;
                                    
                                    if (processed === keys.length) {
                                        window.showSaveStatus('Success', `Uploaded ${successCount} records to IndexedDB successfully!`);
                                        
                                        // Force a sync of the filesystem to ensure the game sees the new save data
                                        if (typeof Eb === 'function') {
                                            console.log('[Save Debug] Triggering filesystem sync after upload');
                                            try {
                                                // Intercept any file download attempts
                                                const originalCreateObjectURL = URL.createObjectURL;
                                                URL.createObjectURL = function(blob) {
                                                    console.log('[Save Debug] Intercepted createObjectURL call, blob size:', blob.size);
                                                    // Only allow specific files or non-save data
                                                    if (blob.size > 100000) { // Legitimate game assets are usually larger
                                                        return originalCreateObjectURL(blob);
                                                    }
                                                    console.log('[Save Debug] Prevented download of likely save data file');
                                                    return null; // Prevent the download
                                                };
                                                
                                                // Set a timeout to restore the original function
                                                // No need to restore functions since we're no longer overriding them
                                                console.log('[Save Debug] Save file download completed');
                                                
                                                Eb(true, function() {
                                                    console.log('[Save Debug] Filesystem sync completed after upload');
                                                    
                                                    // Call Fb with FSSyncCompleted to notify the game engine
                                                    if (typeof Fb === 'function') {
                                                        Fb("FSSyncCompleted", "void");
                                                        console.log('[Save Debug] Notified game engine of sync completion');
                                                    }
                                                    
                                                    // Force a full reload of save data from IndexedDB
                                                    if (window.Module && window.Module.FS) {
                                                        try {
                                                            // First sync from storage to memory
                                                            window.Module.FS.syncfs(true, function(err) {
                                                                if (err) {
                                                                    console.error('[Save Debug] Error during second sync phase:', err);
                                                                } else {
                                                                    console.log('[Save Debug] Second sync phase completed successfully');
                                                                    
                                                                    // Attempt to trigger any game-specific reload functions
                                                                    if (typeof window.reloadGameState === 'function') {
                                                                        window.reloadGameState();
                                                                    }
                                                                    
                                                                    // Notify the user about refresh and add auto-refresh button
                                                                    const refreshMsg = 'Save data uploaded and synced! Refreshing page in 3 seconds to apply changes...';
                                                                    window.showSaveStatus('Success', refreshMsg);
                                                                    
                                                                    // Add auto-refresh functionality to apply the changes
                                                                    console.log('[Save Debug] Setting page to auto-refresh in 3 seconds');
                                                                    setTimeout(() => {
                                                                        console.log('[Save Debug] Auto-refreshing page to apply save data');
                                                                        window.location.reload();
                                                                    }, 3000);
                                                                }
                                                            });
                                                        } catch (syncErr) {
                                                            console.error('[Save Debug] Error during extra sync attempt:', syncErr);
                                                        }
                                                    }
                                                });
                                            } catch (e) {
                                                console.error('[Save Debug] Failed to sync filesystem after upload:', e);
                                            }
                                        }
                                    }
                                };
                                
                                putRequest.onerror = function(event) {
                                    console.error('Failed to store data:', key, event.target.error);
                                    processed++;
                                    
                                    if (processed === keys.length) {
                                        window.showSaveStatus('Warning', `Upload completed with errors. Successfully uploaded ${successCount} out of ${keys.length} records.`);
                                    }
                                };
                            } else {
                                processed++;
                            }
                        });
                        
                        // Handle the case where no valid data was found
                        if (processed === 0) {
                            window.showSaveStatus('Error', 'The uploaded file does not contain any valid data.');
                        }
                    } catch (e) {
                        window.showSaveStatus('Error', 'Failed to process upload: ' + e);
                    }
                };
            } catch (e) {
                window.showSaveStatus('Error', 'Failed to parse uploaded file: ' + e);
            }
        };
        
        reader.onerror = function() {
            window.showSaveStatus('Error', 'Failed to read the uploaded file.');
        };
        
        reader.readAsText(file);
    });
    
    // Reset the file input
    document.getElementById('saveFileUpload').value = '';
};

// Status display functions
window.showSaveStatus = function(type, message) {
    const statusEl = document.getElementById('saveStatus');
    if (!statusEl) return;
    
    statusEl.innerHTML = message;
    statusEl.className = 'save-status ' + type.toLowerCase();
    statusEl.style.color = '#fff';
    statusEl.style.display = 'block';
    
    console.log(`[Save ${type}]: ${message}`);
};

window.hideSaveStatus = function() {
    const statusEl = document.getElementById('saveStatus');
    if (statusEl) {
        statusEl.style.display = 'none';
    }
};

// Initialize immediately when script loads
(function() {
    // Initialize global game state flag - will be set to true when game is ready
    window.gameIsReady = false;

    // Add a file download blocker to prevent unwanted 50KB file downloads
    function installFileDownloadBlocker() {
        // Store the original methods
        const originalCreateObjectURL = URL.createObjectURL;
        const originalCreateElement = document.createElement;
        
        // Save the original functions for cleanup later
        // (No override of URL.createObjectURL or document.createElement - allowing downloads)
        
        console.log('[Save Debug] File download blocker installed');
    }

    // Install the blocker
    installFileDownloadBlocker();

    // Initialize database as soon as possible
    console.log('[Save System] Initializing database immediately');
    window.initSaveDatabase(function(error) {
        if (error) {
            console.error('[Save System] Failed to initialize save database:', error);
        } else {
            console.log('[Save System] Save database initialized successfully');
        }
    });
    
    // Also initialize when DOM is loaded as a backup
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[Save System] DOMContentLoaded event fired, initializing database');
        window.initSaveDatabase(function(error) {
            if (error) {
                console.error('[Save System] Failed to initialize save database on DOMContentLoaded:', error);
            } else {
                console.log('[Save System] Save database initialized successfully on DOMContentLoaded');
            }
        });
    });
    
    // Module patching needs to be safer
    console.log('[Save System] Setting up Module patching when ready');
    
    // Wait for Module to be defined and initialized
    const patchModuleWhenReady = function() {
        if (window.Module && window.Module.FS && window.Module.FS.syncfs) {
            try {
                console.log('[Save System] Patching Module.FS.syncfs');
                const origFSSync = window.Module.FS.syncfs;
                window.Module.FS.syncfs = function(populate, callback) {
                    window.initSaveDatabase(function() {
                        origFSSync(populate, callback);
                    });
                };
                console.log('[Save System] Successfully patched Module.FS.syncfs');
                return true;
            } catch (e) {
                console.error('[Save System] Error patching Module:', e);
                return false;
            }
        }
        return false;
    };
    
    // Try to patch now
    if (!patchModuleWhenReady()) {
        // If not successful, set up multiple opportunities to patch
        console.log('[Save System] Module not ready, will try again later');
        
        // Try again on load
        window.addEventListener('load', function() {
            if (!patchModuleWhenReady()) {
                // Last resort - try after a delay
                setTimeout(patchModuleWhenReady, 1000);
                setTimeout(patchModuleWhenReady, 3000);
            }
        });
    }
})();
