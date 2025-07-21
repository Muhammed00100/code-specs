const express = require('express');
const http = require('http');
const { launch } = require('puppeteer');
const { stream } = require('puppeteer-stream');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const server = http.createServer(app);

app.use(express.static('public'));
app.use(express.json());

const genAI = new GoogleGenerativeAI('AIzaSyBbkfIKUE0XMliq1Sxleofkoii3yOF1-VM');

app.post('/command', async (req, res) => {
    const { command } = req.body;
    console.log('Received command:', command);

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `You are an AI agent controlling a web browser. Your goal is to execute user commands. Based on the user's request, provide a concise JavaScript code snippet to be executed in the browser using Puppeteer. The code should be a single line or a short, self-contained function. For example, to click a button, you might respond with: "await page.click('#submit-button');". User command: "${command}"`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const code = response.text();
        console.log('AI Response:', code);
        try {
            await eval(`(async () => { ${code} })()`);
            res.json({ reply: 'Command executed successfully.' });
        } catch (e) {
            console.error('Error executing Puppeteer code:', e);
            res.status(500).json({ reply: 'Error executing the command.' });
        }
    } catch (error) {
        console.error('Error with Google Generative AI:', error);
        res.status(500).json({ reply: 'An error occurred while processing your command.' });
    }
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

let page;

(async () => {
    const browser = await launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    await page.goto('https://www.google.com');

    app.get('/stream', async (req, res) => {
        const videoStream = await stream(page, {
            audio: false,
            video: true,
        });
        res.writeHead(200, {
            'Content-Type': 'video/webm',
        });
        videoStream.pipe(res);
    });
})();
