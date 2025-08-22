document.addEventListener('DOMContentLoaded', function() {
  const notepadTextarea = document.getElementById('notepad');
  const fileSelector = document.getElementById('fileSelector');
  const fileNameInput = document.getElementById('fileName');
  const saveButton = document.getElementById('saveBtn');
  const deleteButton = document.getElementById('deleteBtn');
  const statusDiv = document.getElementById('status');

  let currentFileId = null;
  let files = {};

  // Load saved files on startup
  loadFiles();

  function loadFiles() {
    chrome.storage.local.get(['notepadFiles'], function(result) {
      if (result.notepadFiles) {
        files = result.notepadFiles;
        updateFileSelector();
      }
    });
  }

  function updateFileSelector() {
    while (fileSelector.options.length > 1) {
      fileSelector.remove(1);
    }
    for (const fileId in files) {
      const option = document.createElement('option');
      option.value = fileId;
      option.textContent = files[fileId].name;
      fileSelector.appendChild(option);
    }
    if (currentFileId && files[currentFileId]) {
      fileSelector.value = currentFileId;
    }
  }

  fileSelector.addEventListener('change', function() {
    const selectedValue = fileSelector.value;
    if (selectedValue === 'new') {
      currentFileId = null;
      notepadTextarea.value = '';
      fileNameInput.value = '';
      fileNameInput.focus();
    } else {
      currentFileId = selectedValue;
      notepadTextarea.value = files[currentFileId].content;
      fileNameInput.value = files[currentFileId].name;
    }
  });

  saveButton.addEventListener('click', function() {
    const fileName = fileNameInput.value.trim();
    const content = notepadTextarea.value;

    if (!fileName) {
      showStatus('Please enter a file name', 'error');
      return;
    }
    if (!currentFileId) {
      currentFileId = 'file_' + Date.now();
    }
    files[currentFileId] = {
      name: fileName,
      content: content,
      lastModified: Date.now()
    };
    chrome.storage.local.set({ notepadFiles: files }, function() {
      updateFileSelector();
      showStatus('File saved!');
    });
  });

  deleteButton.addEventListener('click', function() {
    if (!currentFileId || !files[currentFileId]) {
      showStatus('No file selected to delete', 'error');
      return;
    }
    if (confirm(`Are you sure you want to delete "${files[currentFileId].name}"?`)) {
      delete files[currentFileId];
      chrome.storage.local.set({ notepadFiles: files }, function() {
        currentFileId = null;
        notepadTextarea.value = '';
        fileNameInput.value = '';
        updateFileSelector();
        fileSelector.value = 'new';
        showStatus('File deleted!');
      });
    }
  });

  function showStatus(message, type = 'success') {
    statusDiv.textContent = message;
    statusDiv.style.color = type === 'error' ? '#f44336' : 'green';
    clearTimeout(showStatus._t);
    showStatus._t = setTimeout(function() {
      statusDiv.textContent = '';
    }, 3000);
  }

  // ---------------------------
  // Download Features (no external libs)
  // ---------------------------

  // Download as TXT
  document.getElementById('downloadTxtBtn').addEventListener('click', () => {
    const content = notepadTextarea.value;
    if (!content.trim()) {
      showStatus('Nothing to download', 'error');
      return;
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = (fileNameInput.value.trim() || 'notes') + '.txt';
    a.click();

    URL.revokeObjectURL(url);
  });

  // Download as PDF via native print dialog
  document.getElementById('downloadPdfBtn').addEventListener('click', () => {
    const content = notepadTextarea.value;
    if (!content.trim()) {
      showStatus('Nothing to download', 'error');
      return;
    }

    const title = fileNameInput.value.trim() || 'notes';
    const win = window.open('', '', 'width=800,height=600');

    // Use <pre> to preserve whitespace and wrapping
    // Added font-size: 16px; to the body style
    win.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 24px; 
              font-size: 16px; /* Increased font size for better readability */
            }
            h2 {
              font-size: 20px; /* Slightly larger for the title */
            }
            pre { 
              white-space: pre-wrap; 
              word-wrap: break-word; 
              font-size: 16px; /* Ensure preformatted text also has the desired size */
            }
          </style>
        </head>
        <body>
          <h2>${title}</h2>
          <pre>${content.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>
        </body>
      </html>
    `);
    win.document.close();

    // Ensure the new document is rendered before invoking print
    win.onload = () => {
      win.focus();
      win.print(); // user can choose "Save as PDF"
    };
  });
});
