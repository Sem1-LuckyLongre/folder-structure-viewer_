document.addEventListener("DOMContentLoaded", function () {
    const viewBtn = document.getElementById("viewBtn");
    const folderPath = document.getElementById("folderPath");
    const folderStructure = document.getElementById("folderStructure");
    const loader = document.getElementById("loader");
    const errorMessage = document.getElementById("errorMessage");
    const searchInput = document.getElementById("searchInput");
    const searchCard = document.getElementById("searchCard");
    const expandAllBtn = document.getElementById("expandAllBtn");
    const collapseAllBtn = document.getElementById("collapseAllBtn");
  
    const URI = "http://localhost:3000";
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
      searchCard.style.display = "none";
  
      try {
        const response = await fetch(`${URI}/getFolderStructure`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ folder_url: path }),
        });
  
        const data = await response.json();
  
        if (!response.ok) {
          showError(data.error || "Error fetching folder structure");
          return;
        }
  
        // Display the structure
        folderStructure.classList.remove("empty");
        folderStructure.innerHTML = "";
  
        if (data.folderStructure) {
          // Create a summary div
          const summaryDiv = document.createElement("div");
          summaryDiv.className = "folder-summary";
  
          summaryDiv.innerHTML = `
            <span><i class="fas fa-folder"></i> ${data.allFolders.length || 0} folders</span>
            <span><i class="fas fa-file"></i> ${data.allFiles.length || 0} files</span>
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
  
    function displayFolderStructure(structure, container, basePath = "", level = 0) {
      for (const [folderName, folderData] of Object.entries(structure)) {
        const folderPath = level === 0 ? basePath : `${basePath}\\${folderName}`;
  
        // Create folder container
        const folderContainer = document.createElement("div");
        folderContainer.className = "folder-structure-item";
        folderContainer.style.paddingLeft = `${level * 15}px`;
  
        // Create folder header with toggle
        const folderHeader = document.createElement("div");
        folderHeader.className = "folder-header";
        folderHeader.innerHTML = `
          <span class="folder-toggle">▾</span>
          <i class="fas fa-folder folder-icon"></i>
          <span class="folder-name">${folderName}</span>
        `;
  
        // Create children container
        const childrenContainer = document.createElement("div");
        childrenContainer.className = "folder-children";
  
        // Add files to children container
        if (folderData.files && folderData.files.length > 0) {
          folderData.files.forEach(file => {
            const filePath = `${folderPath}\\${file}`;
            const fileItem = document.createElement("div");
            fileItem.className = "folder-structure-item file-icon cursor-pointer";
            fileItem.style.paddingLeft = "20px";
            fileItem.innerHTML = `<i class="fas fa-file file-icon"></i> ${file}`;
            fileItem.addEventListener("click", () => showFileData(filePath));
            childrenContainer.appendChild(fileItem);
          });
        }
  
        // Add click handler for folder toggle
        const toggle = folderHeader.querySelector(".folder-toggle");
        folderHeader.addEventListener("click", () => {
          toggle.classList.toggle("collapsed");
          childrenContainer.classList.toggle("collapsed");
        });
  
        // Add subfolders recursively
        for (const [subfolderName, subfolderData] of Object.entries(folderData)) {
          if (subfolderName !== "files") {
            displayFolderStructure(
              { [subfolderName]: subfolderData },
              childrenContainer,
              folderPath,
              level + 1
            );
          }
        }
  
        // Assemble the folder structure
        folderContainer.appendChild(folderHeader);
        folderContainer.appendChild(childrenContainer);
        container.appendChild(folderContainer);
      }
      
      // Show search bar after structure is loaded
      searchCard.style.display = "block";
    }
  
    function displayFileList(files, container) {
      files.forEach(filePath => {
        const fileName = filePath.split(/[\\/]/).pop();
        const item = document.createElement("div");
        item.className = "folder-structure-item file-icon cursor-pointer";
        item.innerHTML = `<i class="fas fa-file file-icon"></i> ${fileName}`;
        item.addEventListener("click", () => showFileData(filePath));
        container.appendChild(item);
      });
      
      // Show search bar after files are loaded
      searchCard.style.display = "block";
    }
  
    // Search functionality
    searchInput.addEventListener("input", function() {
      const searchTerm = this.value.trim().toLowerCase();
      if (!searchTerm) {
        // Reset all highlights and show everything
        document.querySelectorAll(".highlight").forEach(el => {
          const parent = el.parentNode;
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          parent.removeChild(el);
          parent.normalize();
        });
        document.querySelectorAll(".folder-structure-item").forEach(el => {
          el.style.display = "flex";
        });
        document.querySelectorAll(".folder-children").forEach(el => {
          el.style.display = "block";
        });
        const emptyState = document.querySelector(".search-empty");
        if (emptyState) emptyState.remove();
        return;
      }
  
      let hasResults = false;
      
      // Hide all items first
      document.querySelectorAll(".folder-structure-item").forEach(el => {
        el.style.display = "none";
      });
  
      // Show matching items and highlight text
      document.querySelectorAll(".folder-structure-item").forEach(el => {
        const text = el.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
          el.style.display = "flex";
          hasResults = true;
          
          // Highlight the matching text
          const regex = new RegExp(searchTerm, "gi");
          const newHTML = el.innerHTML.replace(regex, match => 
            `<span class="highlight">${match}</span>`
          );
          el.innerHTML = newHTML;
          
          // Expand parent folders
          let parent = el.closest(".folder-children");
          while (parent) {
            parent.style.display = "block";
            parent.classList.remove("collapsed");
            const header = parent.previousElementSibling;
            if (header && header.classList.contains("folder-header")) {
              header.style.display = "flex";
              header.querySelector(".folder-toggle").classList.remove("collapsed");
            }
            parent = parent.parentElement.closest(".folder-children");
          }
        }
      });
  
      // Show empty state if no results
      const emptyState = document.querySelector(".search-empty");
      if (!hasResults) {
        if (!emptyState) {
          const emptyDiv = document.createElement("div");
          emptyDiv.className = "search-empty";
          emptyDiv.textContent = "No files or folders match your search";
          folderStructure.appendChild(emptyDiv);
        }
      } else if (emptyState) {
        emptyState.remove();
      }
    });
  
    // Expand all folders
    expandAllBtn.addEventListener("click", function() {
      document.querySelectorAll(".folder-children").forEach(el => {
        el.classList.remove("collapsed");
      });
      document.querySelectorAll(".folder-toggle").forEach(el => {
        el.classList.remove("collapsed");
      });
    });
  
    // Collapse all folders
    collapseAllBtn.addEventListener("click", function() {
      document.querySelectorAll(".folder-children").forEach(el => {
        el.classList.add("collapsed");
      });
      document.querySelectorAll(".folder-toggle").forEach(el => {
        el.classList.add("collapsed");
      });
    });
  
    async function showFileData(path) {
      try {
        const fileDataDiv = document.getElementById("file_data_div");
        const fileDataContent = document.getElementById("file_data_content");
  
        // Show loading state
        fileDataContent.textContent = "Loading file content...";
        fileDataContent.classList.add("loading");
        fileDataDiv.style.display = "flex";
        setTimeout(() => fileDataDiv.classList.add("visible"), 10);
  
        const res = await fetch(`${URI}/getFileData`, {
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
          }" style="margin-right: 8px;"></i>
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
  
    // Copy to clipboard functionality
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
      searchCard.style.display = "none";
    }
  });