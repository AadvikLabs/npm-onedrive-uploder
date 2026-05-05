document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const activeUploads = document.getElementById('active-uploads');
    const assetsList = document.getElementById('file-list');
    const resultModal = document.getElementById('result-modal');
    const closeModal = document.getElementById('close-modal');
    const toast = document.getElementById('toast');

    // Modal Elements
    const viewBtn = document.getElementById('view-btn');
    const downloadBtn = document.getElementById('download-btn');
    const copyBtn = document.getElementById('copy-btn');
    const successMsg = document.getElementById('success-msg');

    let currentSharingLink = '';

    // Drag & Drop Handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragging');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragging');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragging');
        handleFiles(e.dataTransfer.files);
    });

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));

    function handleFiles(files) {
        if (files.length === 0) return;
        activeUploads.classList.remove('hidden');
        Array.from(files).forEach(file => uploadFile(file));
    }

    function uploadFile(file) {
        const item = document.createElement('div');
        item.className = 'asset-item';
        item.innerHTML = `
            <div class="spinner"></div>
            <div style="flex: 1; text-align: left;">
                <div style="font-weight: 600; font-size: 0.9rem;">${file.name}</div>
                <div style="color: #9ca3af; font-size: 0.8rem;">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
        `;
        activeUploads.prepend(item);

        const progressFill = item.querySelector('.progress-fill');
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload', true);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressFill.style.width = percent + '%';
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                const res = JSON.parse(xhr.responseText);
                progressFill.style.width = '100%';
                
                item.innerHTML = `
                    <div style="color: var(--accent);">
                        <i class="fa-solid fa-circle-check fa-lg"></i>
                    </div>
                    <div style="flex: 1; text-align: left;">
                        <div style="font-weight: 600; font-size: 0.9rem;">${file.name}</div>
                        <div style="color: #9ca3af; font-size: 0.8rem;">Uploaded successfully</div>
                    </div>
                    <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.8rem;">Details</button>
                `;

                // Use the proxyUrl for everything internally to ensure public access
                const publicViewUrl = res.data.sharingUrl || res.data.webUrl;
                const proxyUrl = res.data.proxyUrl;

                item.querySelector('button').onclick = () => showResult(file.name, publicViewUrl, res.data.sharingUrl, proxyUrl);
                
                // Show modal for the last file
                showResult(file.name, publicViewUrl, res.data.sharingUrl, proxyUrl);
            } else {
                const err = JSON.parse(xhr.responseText);
                item.innerHTML = `
                    <div style="color: var(--error);">
                        <i class="fa-solid fa-circle-xmark fa-lg"></i>
                    </div>
                    <div style="flex: 1; text-align: left;">
                        <div style="font-weight: 600; font-size: 0.9rem;">${file.name}</div>
                        <div style="color: var(--error); font-size: 0.8rem;">${err.error || 'Upload failed'}</div>
                    </div>
                `;
            }
        };

        xhr.send(formData);
    }

    function showResult(name, webUrl, sharingUrl, proxyUrl) {
        successMsg.innerText = `"${name}" is now safely stored on OneDrive.`;
        viewBtn.href = webUrl;
        
        // IMPORTANT: Use the proxyUrl for the direct download button
        downloadBtn.href = `${proxyUrl}?mode=attachment`;
        downloadBtn.setAttribute('download', name);

        currentSharingLink = sharingUrl || webUrl;

        // Change the status icon to a preview if it's an image
        const statusIcon = document.querySelector('.status-icon');
        if (name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            const img = new Image();
            img.src = proxyUrl;
            img.onload = () => {
                statusIcon.innerHTML = '';
                statusIcon.appendChild(img);
            };
            img.onerror = () => {
                statusIcon.innerHTML = `<i class="fa-solid fa-check"></i>`;
            };
        } else {
            statusIcon.innerHTML = `<i class="fa-solid fa-check"></i>`;
        }

        resultModal.classList.add('active');
    }

    closeModal.addEventListener('click', () => {
        resultModal.classList.remove('active');
    });

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(currentSharingLink).then(() => {
            showToast();
        });
    });

    function showToast() {
        toast.classList.add('active');
        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }

    resultModal.addEventListener('click', (e) => {
        if (e.target === resultModal) resultModal.classList.add('active');
    });
});
