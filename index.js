const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json()); // Middleware to parse JSON requests

// Configure CORS
app.use(
  cors({
    origin: "http://127.0.0.1:5500", // Ensure this matches your frontend origin exactly
    methods: ["GET", "POST", "PUT"],
    allowedHeaders: ["Content-Type"],
    optionsSuccessStatus: 200,
  })
);

/**
 * Recursively retrieves all files and folders, ignoring specified files.
 */
const getAllFilesInFolder = async (folderPath) => {
  let folderStructure = {};
  let allFiles = [];
  let allFolders = [];

  async function processFolder(folderPath, parentObject) {
    try {
      const files = await fs.promises.readdir(folderPath);
      const folderName = path.basename(folderPath);
      parentObject[folderName] = parentObject[folderName] || {};
      const currentFolder = parentObject[folderName];

      for (const file of files) {
        const fullPath = path.join(folderPath, file);
        const stats = await fs.promises.stat(fullPath);

        if (shouldIgnore(file)) continue;

        if (stats.isFile()) {
          currentFolder.files = currentFolder.files || [];
          currentFolder.files.push(file);
          allFiles.push(fullPath);
        } else if (stats.isDirectory()) {
          currentFolder[file] = {};
          allFolders.push(fullPath);
          await processFolder(fullPath, currentFolder);
        }
      }
    } catch (error) {
      console.error("Error reading folder:", folderPath, error);
    }
  }

  await processFolder(folderPath, folderStructure);
  return { folderStructure, allFiles, allFolders };
};

/**
 * Files and folders to ignore
 */
const shouldIgnore = (file) => {
  const ignoredFiles = new Set([
    "node_modules",
    "public",
    "dist",
    "build",
    ".git",
    ".vscode",
    ".idea",
    "out",
    ".next",
    "coverage",
    ".turbo",
    ".expo",
    "yarn.lock",
    "pnpm-lock.yaml",
    "package-lock.json",
    "package.json",
    "tsconfig.json",
    ".gitignore",
    ".eslintignore",
    ".prettierignore",
    ".env",
    "README.md",
    "LICENSE",
    ".npmrc",
    ".nvmrc",
  ]);
  return ignoredFiles.has(file);
};

/**
 * API endpoint to retrieve folder structure.
 */
app.post("/getFolderStructure", async (req, res) => {
  try {
    const { folder_url } = req.body;
    if (!folder_url) {
      return res
        .status(400)
        .json({ error: "Missing folder_url in request body" });
    }

    if (!fs.existsSync(folder_url)) {
      return res.status(404).json({ error: "Folder not found" });
    }

    const { folderStructure, allFiles, allFolders } = await getAllFilesInFolder(
      folder_url
    );

    console.log("Folder Structure:", JSON.stringify(folderStructure, null, 2));
    console.log("Total Files:", allFiles.length);
    console.log("Total Folders:", allFolders.length);

    res.status(200).json({ folderStructure, allFiles, allFolders });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/getFileData", async (req, res) => {
  try {
    const { file_url } = req.body;
    if (!fs.existsSync(file_url)) {
      return res.status(404).json({ error: "File not found" });
    }

    const data = await fs.promises.readFile(file_url, { encoding: "utf8" });
    res.status(200).json({ data });
  } catch (error) {       
    console.error("Server Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } 
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
