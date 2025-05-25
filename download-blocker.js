/**
 * Download Blocker for Undertale Web Port
 * This script prevents the unwanted 50KB file downloads that occur when uploading save files
 */

(function() {
    // Store original methods we'll be overriding
    const originalCreateObjectURL = URL.createObjectURL;
    const originalCreateElement = document.createElement;
    const originalAppendChild = Node.prototype.appendChild;
    
    // Override URL.createObjectURL to prevent small file downloads (likely save data)
    URL.createObjectURL = function(blob) {
        if (blob && blob.size > 0 && blob.size < 100000) {
            console.log('[Download Blocker] Preventing download of small file:', blob.size, 'bytes');
            // Return a special URL that won't actually download anything
            return 'about:blank';
        }
        return originalCreateObjectURL.apply(this, arguments);
    };
    
    // Override createElement to monitor creation of download links
    document.createElement = function(tagName) {
        const element = originalCreateElement.call(document, tagName);
        
        // If an anchor element is being created, monitor its properties
        if (tagName.toLowerCase() === 'a') {
            // Override click method
            const originalClick = element.click;
            element.click = function() {
                if (this.download && this.href && this.href.indexOf('blob:') === 0) {
                    console.log('[Download Blocker] Blocking automatic click on download link:', this.download);
                    return false;
                }
                return originalClick.call(this);
            };
            
            // Override download setter
            const descriptor = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'download');
            if (descriptor && descriptor.configurable) {
                Object.defineProperty(element, 'download', {
                    set: function(value) {
                        if (this.href && this.href.indexOf('blob:') === 0) {
                            console.log('[Download Blocker] Download attribute set on blob URL:', value);
                        }
                        descriptor.set.call(this, value);
                    },
                    get: descriptor.get
                });
            }
        }
        
        return element;
    };
    
    // Override appendChild to catch when download links are added to the document
    Node.prototype.appendChild = function(node) {
        if (node && node.tagName === 'A' && node.download && node.href && node.href.indexOf('blob:') === 0) {
            console.log('[Download Blocker] Blocking addition of download link to document:', node.download);
            return node; // Return the node but don't actually append it
        }
        return originalAppendChild.call(this, node);
    };
    
    console.log('[Download Blocker] Initialized - Will prevent unwanted save file downloads');
})();
