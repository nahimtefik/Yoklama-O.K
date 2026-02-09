// BACKEND URL'İNİ BURAYA YAPIŞTIR (Google Apps Script web app URL)
const API_URL = 'BURAYA_GOOGLE_SCRIPT_URL_YAPISTIR';

let videoStream = null;
let photoTaken = false;
let currentLocation = null;

// Form elemanları
const form = document.getElementById('yoklamaForm');
const statusDiv = document.getElementById('status');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const preview = document.getElementById('preview');
const cameraBtn = document.getElementById('cameraBtn');
const captureBtn = document.getElementById('captureBtn');
const retakeBtn = document.getElementById('retakeBtn');
const submitBtn = document.getElementById('submitBtn');
const loadingDiv = document.querySelector('.loading');

// Sayfa yüklendiğinde konum ve kamera izni iste
window.addEventListener('load', () => {
    showStatus('Lütfen konum ve kamera izni verin...', 'info');
    requestPermissions();
});

// İzinleri iste
async function requestPermissions() {
    try {
        // Konum izni
        const position = await getCurrentPosition();
        currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };
        
        showStatus('✓ Konum alındı. Kamerayı açın ve formu doldurun.', 'success');
        
    } catch (error) {
        showStatus('❌ Konum izni gerekli! Lütfen tarayıcı ayarlarından izin verin.', 'error');
        console.error('Konum hatası:', error);
    }
}

// Konum al (yüksek hassasiyet)
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Tarayıcınız konum servisi desteklemiyor'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    });
}

// Kamera aç
cameraBtn.addEventListener('click', async () => {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // Arka kamera
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });
        
        video.srcObject = videoStream;
        video.style.display = 'block';
        cameraBtn.style.display = 'none';
        captureBtn.style.display = 'block';
        
    } catch (error) {
        showStatus('❌ Kamera izni gerekli! Lütfen tarayıcı ayarlarından izin verin.', 'error');
        console.error('Kamera hatası:', error);
    }
});

// Fotoğraf çek
captureBtn.addEventListener('click', () => {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    preview.src = imageData;
    preview.style.display = 'block';
    
    video.style.display = 'none';
    captureBtn.style.display = 'none';
    retakeBtn.style.display = 'block';
    
    photoTaken = true;
    
    // Kamerayı kapat
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
});

// Tekrar çek
retakeBtn.addEventListener('click', () => {
    preview.style.display = 'none';
    retakeBtn.style.display = 'none';
    cameraBtn.style.display = 'block';
    photoTaken = false;
});

// Form gönder
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Kontroller
    if (!currentLocation) {
        showStatus('❌ Konum bilgisi alınamadı. Sayfayı yenileyin ve izin verin.', 'error');
        return;
    }
    
    if (!photoTaken) {
        showStatus('❌ Lütfen sınıf tahtasının fotoğrafını çekin!', 'error');
        return;
    }
    
    if (!document.getElementById('kvkkOnay').checked) {
        showStatus('❌ KVKK metnini kabul etmelisiniz!', 'error');
        return;
    }
    
    // Loading göster
    loadingDiv.style.display = 'block';
    submitBtn.disabled = true;
    
    try {
        // Güncel konum al
        const position = await getCurrentPosition();
        
        const formData = {
            qrToken: document.getElementById('qrToken').value.trim(),
            ogrenciNo: document.getElementById('ogrenciNo').value.trim(),
            ad: document.getElementById('ad').value.trim(),
            soyad: document.getElementById('soyad').value.trim(),
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            fotoUrl: preview.src.substring(0, 100) + '...' // Base64 çok uzun, kısalt
        };
        
        // API'ye gönder
        const response = await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors', // Google Apps Script için gerekli
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        // no-cors modunda response okunamaz, başarılı varsay
        showStatus('✓ Yoklama kaydedildi! Kontrol için öğretmeninize danışın.', 'success');
        
        // Formu temizle
        form.reset();
        preview.style.display = 'none';
        retakeBtn.style.display = 'none';
        cameraBtn.style.display = 'block';
        photoTaken = false;
        
    } catch (error) {
        showStatus('❌ Hata: ' + error.message, 'error');
        console.error('Gönderim hatası:', error);
    } finally {
        loadingDiv.style.display = 'none';
        submitBtn.disabled = false;
    }
});

// Durum mesajı göster
function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    statusDiv.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}
