// Store the API key securely
 // Replace with your actual Gemini API key
// Replace with your actual API key
const API_KEY = 'AIzaSyB6tv5vHc3gVZiNpKREC2Ud07uBPscs29U';

// Cache DOM elements
const elements = {
    language: document.getElementById('language'),
    category: document.getElementById('category'),
    content: document.getElementById('content'),
    pdfButton: document.getElementById('download-pdf')
};

// Show loading state
function showLoading() {
    elements.content.innerHTML = '<div class="loading">Generating cheatsheet...</div>';
    elements.pdfButton.style.display = 'none';
}

// Show error message
function showError(message) {
    elements.content.innerHTML = `<div class="error">${message}</div>`;
    elements.pdfButton.style.display = 'none';
}

// Main function to get cheatsheet
async function getCheatsheet() {
    showLoading();

    try {
        const language = elements.language.value;
        const category = elements.category.value;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Create a programming cheatsheet for ${category} in ${language}. 
                                  Include code examples with brief comments. Format as code blocks.`
                        }]
                    }]
                })
            }
        );

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const codeHTML = data.candidates[0].content.parts[0].text;
            
            elements.content.innerHTML = `
                <pre><code class="language-${language.toLowerCase()}">
                    ${codeHTML}
                </code></pre>
            `;
            
            Prism.highlightAll();
            elements.pdfButton.style.display = 'block';
        } else {
            throw new Error('No content received from API');
        }
    } catch (error) {
        console.error('Error:', error);
        showError(error.message.includes('API') 
            ? 'API Error: Please check your API key and try again.'
            : 'Error generating cheatsheet. Please try again.');
    }
}

// Improved PDF generation function
async function downloadPDF() {
    if (!elements.content.innerHTML) {
        alert('No content to download!');
        return;
    }

    // Create loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-overlay';
    loadingDiv.innerHTML = '<div class="loading">Generating PDF...</div>';
    document.body.appendChild(loadingDiv);

    try {
        const { jsPDF } = window.jspdf;
        
        // Create styled container for PDF content
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = `
            width: 800px;
            padding: 40px;
            background: white;
            font-family: Arial, sans-serif;
            position: absolute;
            left: -9999px;
        `;

        // Add header
        const language = elements.language.value;
        const category = elements.category.value;
        tempDiv.innerHTML = `
            <h1 style="color: #2c3e50; margin-bottom: 20px; font-size: 24px;">
                ${language} - ${category} Cheatsheet
            </h1>
            <div style="margin-top: 20px; font-size: 14px;">
                ${elements.content.innerHTML}
            </div>
        `;
        
        document.body.appendChild(tempDiv);

        // Convert to canvas with better quality
        const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 800,
            windowHeight: tempDiv.offsetHeight
        });

        document.body.removeChild(tempDiv);

        // Calculate dimensions
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Calculate scaling
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(
            (pageWidth - 20) / imgWidth,
            (pageHeight - 20) / imgHeight
        );

        // Calculate centered position
        const x = (pageWidth - (imgWidth * ratio)) / 2;
        const y = 10; // Top margin

        // Add content to PDF with proper scaling
        let remainingHeight = imgHeight * ratio;
        let currentPosition = 0;
        
        while (remainingHeight > 0) {
            // Add new page if needed
            if (currentPosition > 0) {
                pdf.addPage();
            }
            
            // Calculate height for current page
            const heightOnThisPage = Math.min(remainingHeight, pageHeight - 20);
            
            pdf.addImage(
                imgData,
                'PNG',
                x,
                y,
                imgWidth * ratio,
                imgHeight * ratio,
                '',
                'FAST',
                currentPosition ? 0 : -currentPosition // Crop top portion for subsequent pages
            );
            
            remainingHeight -= heightOnThisPage;
            currentPosition += heightOnThisPage;
        }

        // Save with formatted name
        const fileName = `${language}-${category}-cheatsheet.pdf`.toLowerCase().replace(/\s+/g, '-');
        pdf.save(fileName);

    } catch (error) {
        console.error('PDF Error:', error);
        alert('Failed to generate PDF. Please try again.');
    } finally {
        // Remove loading indicator
        document.body.removeChild(loadingDiv);
    }
}

// Add event listeners
elements.language.addEventListener('change', getCheatsheet);
elements.category.addEventListener('change', getCheatsheet);
elements.pdfButton.addEventListener('click', downloadPDF);
// Theme handling
function toggleTheme() {
    const root = document.documentElement;
    const isDark = root.style.getPropertyValue('--background-color') === '#1a1a1a';
    
    if (isDark) {
        // Light theme
        root.style.setProperty('--background-color', '#f8fafc');
        root.style.setProperty('--card-background', '#ffffff');
        root.style.setProperty('--text-primary', '#1e293b');
        root.style.setProperty('--text-secondary', '#64748b');
    } else {
        // Dark theme
        root.style.setProperty('--background-color', '#1a1a1a');
        root.style.setProperty('--card-background', '#2d2d2d');
        root.style.setProperty('--text-primary', '#ffffff');
        root.style.setProperty('--text-secondary', '#a1a1aa');
    }
}

// View toggle handling
function toggleView(view) {
    const buttons = document.querySelectorAll('.toggle-button');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const contentDiv = document.getElementById('content');
    if (view === 'split') {
        contentDiv.style.display = 'grid';
        contentDiv.style.gridTemplateColumns = '1fr 1fr';
        contentDiv.style.gap = '2rem';
    } else {
        contentDiv.style.display = 'block';
    }
}

// Copy code functionality
function copyCode() {
    const codeElement = document.querySelector('code');
    if (codeElement) {
        const text = codeElement.textContent;
        navigator.clipboard.writeText(text).then(() => {
            alert('Code copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy code:', err);
        });
    }
}

// Search functionality
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', (e) => {
    const searchText = e.target.value.toLowerCase();
    const codeElement = document.querySelector('code');
    if (codeElement) {
        const text = codeElement.textContent;
        const lines = text.split('\n');
        const filteredLines = lines.filter(line => 
            line.toLowerCase().includes(searchText)
        );
        if (searchText) {
            codeElement.innerHTML = filteredLines.join('\n');
            Prism.highlightElement(codeElement);
        } else {
            // Restore original content
            getCheatsheet();
        }
    }
});
