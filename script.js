// Store the API key securely
const API_KEY = 'AIzaSyB6tv5vHc3gVZiNpKREC2Ud07uBPscs29U'; // Replace with your actual Gemini API key

// Cache DOM elements
const elements = {
    language: document.getElementById('language'),
    category: document.getElementById('category'),
    content: document.getElementById('content'),
    pdfButton: document.getElementById('download-pdf')
};

// Main function to get cheatsheet
async function getCheatsheet() {
    try {
        // Show loading state
        elements.content.innerHTML = '<div class="loading">Generating cheatsheet...</div>';
        elements.pdfButton.style.display = 'none';

        const language = elements.language.value;
        const category = elements.category.value;

        // Make API request
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
                            text: `Provide a detailed good quality notes for ${category} in ${language}. Include only code examples with brief comments. Give the output in HTML format.`
                        }]
                    }]
                })
            }
        );

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        // Handle the response
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const codeHTML = data.candidates[0].content.parts[0].text;
            
            // Update content and highlight syntax
            elements.content.innerHTML = `<pre><code class="language-${language.toLowerCase()}">${codeHTML}</code></pre>`;
            Prism.highlightAll();
            
            // Show download button
            elements.pdfButton.style.display = 'block';
        } else {
            throw new Error('No content received from API');
        }
    } catch (error) {
        console.error('Error:', error);
        elements.content.innerHTML = `
            <div class="error">
                Error: ${error.message}
                ${error.message.includes('API key') ? '<br>Please check your API key.' : ''}
            </div>`;
    }
}

// Function to download PDF
async function downloadPDF() {
    if (!elements.content.innerHTML) {
        alert('No content to download!');
        return;
    }

    // Show loading message
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-overlay';
    loadingDiv.innerHTML = 'Generating PDF...';
    document.body.appendChild(loadingDiv);

    try {
        const { jsPDF } = window.jspdf;

        // Create temporary div for conversion
        const tempDiv = document.createElement('div');
        tempDiv.style.width = '800px';
        tempDiv.innerHTML = elements.content.innerHTML;
        document.body.appendChild(tempDiv);

        // Convert to canvas
        const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            logging: false
        });

        // Remove temporary div
        document.body.removeChild(tempDiv);

        // Create PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasHeight = canvas.height;
        const canvasWidth = canvas.width;

        const aspectRatio = canvasWidth / canvasHeight;
        const imgHeight = pdfWidth / aspectRatio;

        let position = 0;

        // Split content into pages
        while (position < canvasHeight) {
            const section = document.createElement('canvas');
            section.width = canvas.width;
            section.height = Math.min(canvasHeight - position, canvasWidth * pdfHeight / pdfWidth);

            const ctx = section.getContext('2d');
            ctx.drawImage(
                canvas,
                0,
                position,
                canvasWidth,
                section.height,
                0,
                0,
                section.width,
                section.height
            );

            const imgData = section.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            position += section.height;

            // Add a new page if there is more content
            if (position < canvasHeight) {
                pdf.addPage();
            }
        }

        pdf.save('cheatsheet.pdf');
    } catch (error) {
        console.error('PDF generation error:', error);
        alert('Failed to generate PDF. Please try again.');
    } finally {
        // Remove loading message
        document.body.removeChild(loadingDiv);
    }
}
