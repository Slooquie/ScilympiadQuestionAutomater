// Function to fetch models
async function fetchModels() {
    const apiKey = document.getElementById('apiKey').value;
    const modelSelect = document.getElementById('modelSelect');
    const statusDiv = document.getElementById('status');

    if (!apiKey) {
        statusDiv.textContent = 'Please enter API Key first.';
        return;
    }

    statusDiv.textContent = 'Fetching models...';
    modelSelect.innerHTML = '<option value="" disabled selected>Loading...</option>';

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        modelSelect.innerHTML = ''; // Clear loading
        const models = data.models || [];

        // Filter for generation models
        const genModels = models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'));

        if (genModels.length === 0) {
            const option = document.createElement('option');
            option.text = "No compatible models found";
            modelSelect.add(option);
            return;
        }

        genModels.forEach(model => {
            const option = document.createElement('option');
            // Remove 'models/' prefix for cleaner display and value usage if needed, 
            // but the API expects 'models/gemini-pro' or just 'gemini-pro'. 
            // The name field is usually 'models/gemini-pro'.
            option.value = model.name.replace('models/', '');
            option.text = model.displayName || model.name;
            modelSelect.add(option);
        });

        // Set default if available
        if (genModels.some(m => m.name.includes('gemini-1.5-flash'))) {
            modelSelect.value = 'gemini-1.5-flash';
        } else if (modelSelect.options.length > 0) {
            modelSelect.selectedIndex = 0;
        }

        statusDiv.textContent = 'Models loaded.';

    } catch (error) {
        statusDiv.textContent = 'Error fetching models: ' + error.message;
        modelSelect.innerHTML = '<option value="" disabled selected>Error loading models</option>';
        console.error(error);
    }
}

document.getElementById('refreshModelsBtn').addEventListener('click', fetchModels);

// Helper to read file as base64
const fileToGenerativePart = async (file) => {
    const base64EncodedDataPromise = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

document.getElementById('processBtn').addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKey').value;
    const model = document.getElementById('modelSelect').value;
    const testFile = document.getElementById('testFile').files[0];
    const answerKeyFile = document.getElementById('answerKeyFile').files[0];
    const testText = document.getElementById('testText').value; // Now optional/supplementary
    const statusDiv = document.getElementById('status');

    if (!apiKey) {
        statusDiv.textContent = 'Please provide API Key.';
        return;
    }

    if (!model) {
        statusDiv.textContent = 'Please select a model.';
        return;
    }

    if (!testFile && !testText) {
        statusDiv.textContent = 'Please provide a Test PDF or paste text.';
        return;
    }

    statusDiv.textContent = `Parsing with ${model}...`;

    try {
        const parts = [];

        // System Instruction / Context
        let systemPrompt = `You are a precise data-extraction parser for Science Olympiad tests. 
        Your task is to extract questions and answers and convert them into a strict JSON array.
        Format: [{"question_number": 1, "question_text": "...", "type": "multiple_choice" | "true_false" | "short_answer", "options": ["A", "B", "C", "D"] or null, "correct_answer": "...", "points": 1, "requires_image": true/false}].
        
        CRITICAL INSTRUCTIONS:
        1. Output ONLY minified JSON.
        2. "requires_image": Set to true IF the question refers to a diagram, graph, map, or picture present in the document.
        3. For "short_answer" questions (FRQs), set "options" to null and put the expected answer rubric or expected text in "correct_answer".
        4. If an answer key is provided, use it.
        `;

        if (testText) {
            systemPrompt += `\n\nAdditional Instructions/Context:\n${testText}`;
        }

        parts.push({ text: systemPrompt });

        if (testFile) {
            parts.push(await fileToGenerativePart(testFile));
        }

        if (answerKeyFile) {
            parts.push(await fileToGenerativePart(answerKeyFile));
        }

        // If only text was provided and no files, we still need to pass it, but we already added it to systemPrompt. 
        // If the user pasted the ENTIRE test in text, it's effectively the test content.
        // Let's ensure the model treats 'testText' as content if no file is present.
        if (!testFile && testText && parts.length === 1) {
            // If parts has only system prompt (which contains testText), that's fine. 
            // unique case: user meant testText to be the test itself.
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: parts
                }]
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        if (!data.candidates || !data.candidates[0].content) {
            throw new Error("No content generated. The model might have been blocked or failed.");
        }

        const jsonString = data.candidates[0].content.parts[0].text;
        const cleanJsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanJsonString);

        await chrome.storage.local.set({ scilympiadTestData: parsedData });
        console.log('Popup: Data saved to chrome.storage.local:', parsedData);

        statusDiv.textContent = 'Success! Data saved. Opening preview...';

        // Open preview page in a new tab
        window.open(chrome.runtime.getURL('preview.html'), '_blank');

    } catch (error) {
        statusDiv.textContent = 'Error: ' + error.message;
        console.error(error);
    }
});

document.getElementById('openTabBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
});
