document.addEventListener("DOMContentLoaded", function () {
  // Get all required elements
  const viewBtn = document.getElementById("viewBtn");
  const folderPath = document.getElementById("folderPath");
  const folderStructure = document.getElementById("folderStructure");
  const loader = document.getElementById("loader");
  const errorMessage = document.getElementById("errorMessage");
  const searchInput = document.getElementById("searchInput");
  const clearSearchBtn = document.getElementById("clearSearch");
  const filterFiles = document.getElementById("filterFiles");
  const filterFolders = document.getElementById("filterFolders");
  const noResults = document.getElementById("noResults");
  const foldersCount = document.getElementById("foldersCount");
  const filesCount = document.getElementById("filesCount");

  // Check if required elements exist
  if (!viewBtn || !folderPath || !folderStructure) {
    console.error("Required elements not found");
    return;
  }

  const URI = "https://folder-structure-viewer-backend.onrender.com";
  let currentStructure = null;
  let currentBasePath = "";

  // Initialize the app
  folderStructure.textContent = "Folder structure will be displayed here...";

  // Add event listeners only if elements exist
  viewBtn.addEventListener("click", fetchFolderStructure);
  
  if (searchInput) {
    searchInput.addEventListener("input", filterStructure);
  }
  
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", clearSearch);
  }
  
  if (filterFiles) {
    filterFiles.addEventListener("change", filterStructure);
  }
  
  if (filterFolders) {
    filterFolders.addEventListener("change", filterStructure);
  }

  // Fetch folder structure from server
  async function fetchFolderStructure() {
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
    noResults.style.display = "none";

    try {
      const response = await fetch(`${URI}/getFolderStructure`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ folder_url: path }),
      });

      const data = await response.json();
      console.log(data);
      
      if (!response.ok) {
        showError(data.error || "Error fetching folder structure");
        return;
      }

      // Store the current structure for filtering
      currentStructure = data;
      currentBasePath = path;

      // Display the structure
      displayStructure(data, path);
    } catch (error) {
      showError("Failed to connect to server");
      console.error(error);
    } finally {
      viewBtn.disabled = false;
      viewBtn.innerHTML = '<i class="fas fa-eye"></i> View Structure';
      loader.style.display = "none";
    }
  }

  // Display the folder structure
  function displayStructure(data, path) {
    folderStructure.classList.remove("empty");
    folderStructure.innerHTML = "";
    noResults.style.display = "none";

    // Create summary
    const folderCount = data.allFolders?.length || 0;
    const fileCount = data.allFiles?.length || 0;

    foldersCount.textContent = `${folderCount} ${
      folderCount === 1 ? "folder" : "folders"
    }`;
    filesCount.textContent = `${fileCount} ${
      fileCount === 1 ? "file" : "files"
    }`;

    if (data.folderStructure) {
      const summaryDiv = document.createElement("div");
      summaryDiv.className = "folder-summary";
      summaryDiv.innerHTML = `
          <span><i class="fas fa-folder"></i> ${folderCount} ${
        folderCount === 1 ? "folder" : "folders"
      }</span>
          <span><i class="fas fa-file"></i> ${fileCount} ${
        fileCount === 1 ? "file" : "files"
      }</span>
        `;
      folderStructure.appendChild(summaryDiv);
      displayFolderStructure(data.folderStructure, folderStructure, path);
    } else if (data.allFiles) {
      displayFileList(data.allFiles, folderStructure);
    } else {
      showError("No folder data received");
    }
  }

  // Display folder structure recursively
  function displayFolderStructure(
    structure,
    container,
    basePath = "",
    level = 0
  ) {
    for (const [folderName, folderData] of Object.entries(structure)) {
      const folderPath = level === 0 ? basePath : `${basePath}/${folderName}`;
      const folderItem = document.createElement("div");
      folderItem.className = "folder-structure-item folder-icon";
      folderItem.style.paddingLeft = `${20 + level * 15}px`;
      
      // Create folder container
      const folderContainer = document.createElement("div");
      folderContainer.className = "folder-container expanded";
      
      // Create toggle button
      const toggleBtn = document.createElement("span");
      toggleBtn.className = "toggle-btn expanded";
      toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
      
      // Create folder name span
      const folderNameSpan = document.createElement("span");
      folderNameSpan.className = "folder-name";
      folderNameSpan.textContent = folderName;
      
      // Add click handler for toggle
      folderItem.addEventListener("click", (e) => {
        if (e.target === toggleBtn || e.target.parentElement === toggleBtn) {
          const isExpanded = folderContainer.classList.contains("expanded");
          folderContainer.classList.toggle("expanded");
          toggleBtn.classList.toggle("expanded");
          toggleBtn.classList.toggle("collapsed");
        }
      });
      
      // Assemble folder item
      folderItem.appendChild(toggleBtn);
      folderItem.appendChild(folderNameSpan);
      folderContainer.appendChild(folderItem);
      
      // Create children container
      const childrenContainer = document.createElement("div");
      childrenContainer.className = "children-container";
      
      folderItem.dataset.type = "folder";
      folderItem.dataset.path = folderPath;
      folderItem.dataset.name = folderName;
      container.appendChild(folderContainer);

      // Display files in this folder
      if (folderData.files && folderData.files.length > 0) {
        folderData.files.forEach((file) => {
          const filePath = `${folderPath}/${file}`;
          const fileItem = document.createElement("div");
          fileItem.className = "folder-structure-item file-icon cursor-pointer";
          fileItem.style.paddingLeft = `${20 + (level + 1) * 15}px`;
          fileItem.textContent = file;
          fileItem.dataset.type = "file";
          fileItem.dataset.path = filePath;
          fileItem.dataset.name = file;
          fileItem.addEventListener("click", () => showFileData(filePath));
          childrenContainer.appendChild(fileItem);
        });
      }

      // Recursively display subfolders
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
      
      // Add children container to folder container
      folderContainer.appendChild(childrenContainer);
    }
  }

  // Display simple file list
  function displayFileList(files, container) {
    files.forEach((filePath) => {
      const fileName = filePath.split(/[\\/]/).pop();
      const item = document.createElement("div");
      item.className = "folder-structure-item file-icon cursor-pointer";
      item.textContent = fileName;
      item.dataset.type = "file";
      item.dataset.path = filePath;
      item.dataset.name = fileName;
      item.addEventListener("click", () => showFileData(filePath));
      container.appendChild(item);
    });
  }

  // Filter the displayed structure based on search input
  function filterStructure() {
    if (!currentStructure) return;

    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const showFiles = filterFiles ? filterFiles.checked : true;
    const showFolders = filterFolders ? filterFolders.checked : true;

    if (clearSearchBtn) {
      if (searchTerm.length > 0) {
        clearSearchBtn.classList.add("visible");
      } else {
        clearSearchBtn.classList.remove("visible");
      }
    }

    const items = folderStructure.querySelectorAll(".folder-structure-item");
    let visibleCount = 0;

    // First pass: Mark all items as hidden
    items.forEach(item => {
      item.style.display = "none";
    });

    // Second pass: Show matching folders and their children
    items.forEach((item) => {
      const itemName = item.dataset.name.toLowerCase();
      const isFile = item.dataset.type === "file";
      const isFolder = item.dataset.type === "folder";
      
      // Only search in folders
      const matchesSearch = isFolder && (searchTerm === "" || itemName.includes(searchTerm));
      const matchesType = (isFile && showFiles) || (isFolder && showFolders);
      const shouldShow = matchesSearch && matchesType;

      if (shouldShow) {
        // Show the matching folder
        item.style.display = "";
        visibleCount++;

        // If it's a folder and matches search, show its children
        if (isFolder && matchesSearch) {
          const folderContainer = item.closest('.folder-container');
          if (folderContainer) {
            folderContainer.classList.add('expanded');
            const toggleBtn = folderContainer.querySelector('.toggle-btn');
            if (toggleBtn) {
              toggleBtn.classList.add('expanded');
              toggleBtn.classList.remove('collapsed');
            }
            
            // Show all children of matching folder
            const childrenContainer = folderContainer.querySelector('.children-container');
            if (childrenContainer) {
              childrenContainer.style.display = '';
              const childItems = childrenContainer.querySelectorAll('.folder-structure-item');
              childItems.forEach(child => {
                child.style.display = '';
                visibleCount++;
              });
            }
          }
        }

        if (searchTerm) {
          const regex = new RegExp(searchTerm, "gi");
          const highlightedName = item.dataset.name.replace(
            regex,
            (match) => `<span class="highlight">${match}</span>`
          );
          
          // Preserve the folder icon and toggle button for folders
          if (isFolder) {
            const folderIcon = item.querySelector('.folder-name');
            if (folderIcon) {
              folderIcon.innerHTML = highlightedName;
            }
          }
        } else {
          // Restore original content for folders
          if (isFolder) {
            const folderIcon = item.querySelector('.folder-name');
            if (folderIcon) {
              folderIcon.textContent = item.dataset.name;
            }
          }
        }
      }
    });

    if (noResults) {
      if (visibleCount === 0 && (searchTerm || !showFiles || !showFolders)) {
        noResults.style.display = "flex";
      } else {
        noResults.style.display = "none";
      }
    }
  }

  // Clear search input and reset filters
  function clearSearch() {
    if (searchInput) {
      searchInput.value = "";
    }
    if (clearSearchBtn) {
      clearSearchBtn.classList.remove("visible");
    }
    if (filterFiles) {
      filterFiles.checked = true;
    }
    if (filterFolders) {
      filterFolders.checked = true;
    }
    filterStructure();
  }

  // Show file content in the preview panel
  async function showFileData(path) {
    console.log(path);
    // let filePath = path;
    // if(path.includes("/")){
    //   filePath = path.split("/")[1];
    // }
    // console.log(filePath,path);
    
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

  // Copy file content to clipboard
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

  // Close file preview panel
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

  // Show error message
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
    folderStructure.innerHTML = "";
    folderStructure.classList.add("empty");
    folderStructure.textContent = "Folder structure will be displayed here...";
    noResults.style.display = "none";
  }
});
