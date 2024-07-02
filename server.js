require("dotenv").config();
const express = require("express");
const axios = require("axios");

// ... (rest of the code)
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const NOTION_TOKEN = process.env.NOTION_TOKEN;

const app = express();

app.use(express.json());

// In-memory storage (replace with a database in production)
const integrationMap = new Map();

app.post("/setup-integration", (req, res) => {
  const { fileId, notionPageId } = req.body;
  integrationMap.set(fileId, notionPageId);
  res.sendStatus(200);
});

app.post("/webhook", async (req, res) => {
  const { event_type, file_key, comment_id } = req.body;

  if (event_type === "FILE_COMMENT") {
    const notionPageId = integrationMap.get(file_key);
    if (!notionPageId) {
      console.log(`No Notion page configured for Figma file ${file_key}`);
      return res.sendStatus(200);
    }

    try {
      // Fetch comment details from Figma
      const figmaResponse = await axios.get(
        `https://api.figma.com/v1/files/${file_key}/comments/${comment_id}`,
        {
          headers: { "X-Figma-Token": FIGMA_TOKEN },
        }
      );
      const comment = figmaResponse.data;

      // Add comment to Notion
      await axios.post(
        `https://api.notion.com/v1/blocks/${notionPageId}/children`,
        {
          children: [
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [
                  {
                    type: "text",
                    text: {
                      content: `${comment.user.handle}: ${comment.message}`,
                    },
                  },
                ],
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${NOTION_TOKEN}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
        }
      );

      res.sendStatus(200);
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(200);
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
