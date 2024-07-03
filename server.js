require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { Client } = require("@notionhq/client");
// test-notion.js

// ... rest of your server code
// ... (rest of the code)
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const NOTION_TOKEN = process.env.NOTION_TOKEN;

// Initialize the Notion client
const notion = new Client({
  auth: NOTION_TOKEN,
});

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.json());

// In-memory storage (replace with a database in production)
const integrationMap = new Map();

app.post("/setup-integration", (req, res) => {
  const { fileId, notionPageId } = req.body;
  console.log(
    `Setting up integration for Figma file ${fileId} and Notion page ${notionPageId}`
  );
  integrationMap.set(fileId, notionPageId);
  res.sendStatus(200);
});

app.post("/webhook", async (req, res) => {
  const { comment, event_type, file_key, comment_id, triggered_by } = req.body;

  if (event_type === "FILE_COMMENT") {
    const notionPageId = integrationMap.get(file_key);
    if (!notionPageId) {
      console.log(`No Notion page configured for Figma file ${file_key}`);
      return res.sendStatus(400);
    }

    console.log(req.body);
    console.log(
      `Received comment event for Figma file ${file_key}- ${comment_id}`
    );
    try {
      const response = await notion.blocks.children.append({
        block_id: notionPageId,
        children: [
          {
            object: "block",
            type: "heading_2",
            heading_2: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: `${triggered_by.handle} says ${comment[0]?.text}`,
                  },
                },
              ],
            },
          },
        ],
      });

      console.log("Content added successfully!");
      res.sendStatus(200);
    } catch (error) {
      console.error("Error adding content to Notion:", error.body);
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(200);
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
