document.addEventListener("DOMContentLoaded", function () {
  const viewBtn = document.getElementById("viewBtn");
  const folderPath = document.getElementById("folderPath");
  const folderStructure = document.getElementById("folderStructure");
  const loader = document.getElementById("loader");
  const errorMessage = document.getElementById("errorMessage");

  folderStructure.textContent = "Folder structure will be displayed here...";

  viewBtn.addEventListener("click", async function () {
    const path = folderPath.value.trim();

    if (!path) {
      showError("Please enter a folder path");
      return;
    }

    // Show loading state
    viewBtn.disabled = true;
    viewBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    folderStructure.innerHTML = "";
    folderStructure.classList.add("empty");
    loader.style.display = "block";
    errorMessage.style.display = "none";

    try {
      const response = await fetch("http://localhost:3000/getFolderStructure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ folder_url: path }),
      });

      const data = await response.json();
      //   console.log(data);

      if (!response.ok) {
        showError(data.error || "Error fetching folder structure");
        return;
      }

      // Display the structure
      folderStructure.classList.remove("empty");
      folderStructure.innerHTML = "";

      // Replace the summary creation part with:
      if (data.folderStructure) {
        // Create a summary div
        const summaryDiv = document.createElement("div");
        summaryDiv.className = "folder-summary";

        summaryDiv.innerHTML = `
      <span><i class="fas fa-folder"></i> ${
        data.allFolders.length || 0
      } folders</span>
      <span><i class="fas fa-file"></i> ${
        data.allFiles.length || 0
      } files</span>
    `;

        folderStructure.appendChild(summaryDiv);
        displayFolderStructure(data.folderStructure, folderStructure, path);
      } else if (data.allFiles) {
        displayFileList(data.allFiles, folderStructure);
      } else {
        showError("No folder data received");
      }
    } catch (error) {
      showError("Failed to connect to server");
      console.error(error);
    } finally {
      viewBtn.disabled = false;
      viewBtn.innerHTML = '<i class="fas fa-eye"></i> View Structure';
      loader.style.display = "none";
    }
  });

  function displayFolderStructure(
    structure,
    container,
    basePath = "",
    level = 0
  ) {
    for (const [folderName, folderData] of Object.entries(structure)) {
      // For the root folder, use the basePath directly
      const folderPath = level === 0 ? basePath : `${basePath}\\${folderName}`;

      // Create folder item
      const folderItem = document.createElement("div");
      folderItem.className = "folder-structure-item folder-icon";
      folderItem.style.paddingLeft = `${20 + level * 15}px`;
      folderItem.textContent = folderName;
      //   folderItem.onclick = () => alert(`Folder: ${folderPath}`);
      container.appendChild(folderItem);

      // Display files in this folder if they exist
      if (folderData.files && folderData.files.length > 0) {
        folderData.files.forEach((file) => {
          const filePath = `${folderPath}\\${file}`;
          const fileItem = document.createElement("div");
          fileItem.className = "folder-structure-item file-icon cursor-pointer";
          fileItem.style.paddingLeft = `${20 + (level + 1) * 15}px`;
          fileItem.textContent = file;
          fileItem.addEventListener("click", () => showFileData(filePath));
          container.appendChild(fileItem);
        });
      }

      // Recursively display subfolders
      for (const [subfolderName, subfolderData] of Object.entries(folderData)) {
        if (subfolderName !== "files") {
          displayFolderStructure(
            { [subfolderName]: subfolderData },
            container,
            folderPath,
            level + 1
          );
        }
      }
    }
  }

  function displayFileList(files, container) {
    files.forEach((filePath) => {
      const fileName = filePath.split(/[\\/]/).pop();
      const item = document.createElement("div");
      item.className = "folder-structure-item file-icon cursor-pointer";
      item.textContent = fileName;
      // item.onclick = () => alert(`File Path: ${filePath}`);
      container.appendChild(item);
    });
  }

  async function showFileData(path) {
    try {
      const fileDataDiv = document.getElementById("file_data_div");
      const fileDataContent = document.getElementById("file_data_content");

      // Show loading state
      fileDataContent.textContent = "Loading file content...";
      fileDataContent.classList.add("loading");
      fileDataDiv.style.display = "flex";
      setTimeout(() => fileDataDiv.classList.add("visible"), 10);

      const res = await fetch("http://localhost:3000/getFileData", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file_url: path }),
      });
      const data = await res.json();

      if (!res.ok) {
        showError(data.error || "Error fetching file data");
        fileDataContent.textContent = "Error loading file content";
        return;
      }

      // Update the file data display
      const fileName = path.split(/[\\/]/).pop();
      const fileType = fileName.split(".").pop().toLowerCase();

      document.getElementById("file_data_title").innerHTML = `
                        <i class="fas fa-file${
                          fileType === "js"
                            ? "-code"
                            : fileType === "css"
                            ? "-import"
                            : fileType === "html"
                            ? "-export"
                            : "-alt"
                        }" 
                           style="margin-right: 8px;"></i>
                        <span>${fileName}</span>
                    `;

      // Set the content with file type attribute for syntax coloring
      fileDataContent.textContent = data.data;
      fileDataContent.setAttribute("data-filetype", fileType);
      fileDataContent.classList.remove("loading");

      // Calculate lines and columns
      const lines = data.data.split("\n").length;
      const maxCols = data.data
        .split("\n")
        .reduce((max, line) => Math.max(max, line.length), 0);

      document.getElementById("file_data_lines").textContent = `${lines} ${
        lines === 1 ? "line" : "lines"
      }`;
      document.getElementById("file_data_cols").textContent = `${maxCols} cols`;
    } catch (error) {
      document.getElementById("file_data_content").textContent =
        "Error loading file content";
      showError(error.message || "Error displaying file data");
    }
  }

  // Add this near the other event listeners (where the close button and zoom are handled)
  document
    .getElementById("file_data_copy")
    .addEventListener("click", function () {
      const content = document.getElementById("file_data_content").textContent;
      const copyBtn = this;

      navigator.clipboard
        .writeText(content)
        .then(() => {
          // Show success state
          copyBtn.classList.add("success");
          copyBtn.innerHTML = '<i class="fas fa-check"></i>';

          // Reset after 2 seconds
          setTimeout(() => {
            copyBtn.classList.remove("success");
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
          }, 2000);
        })
        .catch((err) => {
          console.error("Failed to copy: ", err);
          copyBtn.innerHTML = '<i class="fas fa-times"></i>';
          setTimeout(() => {
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
          }, 1000);
        });
    });

  // Close button functionality with animation
  document
    .getElementById("file_data_close")
    .addEventListener("click", function () {
      const fileDataDiv = document.getElementById("file_data_div");
      fileDataDiv.classList.remove("visible");
      setTimeout(() => {
        fileDataDiv.style.display = "none";
      }, 300);
    });

  // Zoom functionality
  let zoomLevel = 1;
  document.querySelectorAll(".file-data-zoom-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const content = document.getElementById("file_data_content");
      if (this.querySelector(".fa-search-plus")) {
        zoomLevel = Math.min(zoomLevel + 0.1, 1.5);
      } else {
        zoomLevel = Math.max(zoomLevel - 0.1, 0.8);
      }
      content.style.fontSize = `${zoomLevel * 0.9}rem`;
      document.querySelector(
        ".file-data-zoom span"
      ).textContent = `${Math.round(zoomLevel * 100)}%`;
    });
  });

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
    folderStructure.innerHTML = "";
    folderStructure.classList.add("empty");
    folderStructure.textContent = "Folder structure will be displayed here...";
  }
});
