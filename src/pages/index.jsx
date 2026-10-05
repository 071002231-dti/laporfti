import React, { useState } from'react';

// --- Design Constants based on requirements ---
const PURPLE_ACCENT = '#6200EE';
const LIGHT_BG = '#F9F9F9';
const TEXT_COLOR = '#1A1A1A';
const CARD_BG = '#FFFFFF';

// --- Mock Data ---
const categories = [
    { name: 'Akademik', count: 12 },
    { name: 'Fasilitas', count: 5 },
    { name: 'Administrasi', count: 3 },
    { name: 'Sistem Informasi', count: 8 },
    { name: 'Kemahasiswaan', count: 15 },
    { name: 'Keuangan', count: 2 },
    { name: 'Etika', count: 1 },
    { name: 'Lainnya', count: 7 },
];

// --- Components ---

// 1. Header and CTAs
const Header = () => (
    <header style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E0E0E0', padding: '2rem 0', textAlign: 'center' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2.5rem', color: TEXT_COLOR }}>Lapor FTI</h1>
            <p style={{ color: '#555', fontSize: '1.1rem', marginTop: '0.5rem' }}>
                Platform resmi FTI UII untuk Aspirasi dan Aduan Civitas Akademika. Terintegrasi dengan sistem akademik kampus.
            </p>
        </div>
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '15px' }}>
            <button 
                style={{ 
                    backgroundColor: PURPLE_ACCENT, 
                    color: 'white', 
                    padding: '12px 25px', 
                    borderRadius: '5px', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontSize: '1rem',
                    fontWeight: 'bold'
                }}
            >
                Buat Aduan / Aspirasi
            </button>
            <button 
                style={{ 
                    backgroundColor: 'white', 
                    color: PURPLE_ACCENT, 
                    padding: '12px 25px', 
                    borderRadius: '5px', 
                    border: `1px solid ${PURPLE_ACCENT}`, 
                    cursor: 'pointer', 
                    fontSize: '1rem'
                }}
            >
                Lihat Laporan Publik
            </button>
        </div>
    </header>
);

// 2. Ticket Tracking
const TicketTracker = () => {
    const [ticketCode, setTicketCode] = useState('');
    const [status, setStatus] = useState('');

    const handleSearch = () => {
        // Mock search logic
        setStatus(`Searching for ticket ${ticketCode}... (Mock API call)`);
    };

    return (
        <section style={{ padding: '3rem 0', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E0E0E0' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                <h2 style={{ color: TEXT_COLOR }}>Lacak Status Aduan Anda</h2>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                    <input 
                        type="text" 
                        placeholder="Masukkan Kode Tiket (e.g., TKT12345)" 
                        value={ticketCode}
                        onChange={(e) => setTicketCode(e.target.value)}
                        style={{ padding: '12px', fontSize: '1rem', width: '60%', border: '1px solid #CCC', borderRadius: '5px 0 0 5px' }}
                    />
                    <button 
                        onClick={handleSearch}
                        style={{ 
                            padding: '12px 20px', 
                            backgroundColor: PURPLE_ACCENT, 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '0 5px 5px 0', 
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        Cari
                    </button>
                </div>
                {status && <p style={{ marginTop: '1rem', color: '#555' }}>Status: {status}</p>}
            </div>
        </section>
    );
};

// 3. Trust Section
const TrustSection = () => (
    <section style={{ padding: '3rem 0', backgroundColor: LIGHT_BG, borderBottom: '1px solid #E0E0E0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent:'space-around', textAlign: 'center' }}>
            {[
                { title: "Privasi Terjamin", description: "Data Anda aman dan hanya digunakan untuk penyelesaian aduan." },
                { title: "Transparansi Proses", description: "Setiap langkah penanganan aduan akan dilaporkan secara berkala." },
                { title: "Respons Berkelanjutan", description: "Kami berkomitmen untuk memberikan solusi yang cepat dan efektif." }
            ].map((item, index) => (
                <div key={index} style={{ flex: 1, padding: '0 15px' }}>
                    <h3 style={{ color: PURPLE_ACCENT, fontSize: '1.3rem' }}>{item.title}</h3>
                    <p style={{ color: '#555' }}>{item.description}</p>
                </div>
            ))}
        </div>
    </section>
);

// 4. Category Cards
const CategoryCard = ({ name, count }) => (
    <div style={{ 
        backgroundColor: CARD_BG, 
        padding: '20px', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)', 
        borderBottom: `3px solid ${PURPLE_ACCENT}`,
        cursor: 'pointer',
        transition: 'transform 0.2s'
    }}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'translate(2px, 2px)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'translate(0, 0)'}
    >
        <h4 style={{ margin: '0 0 5px 0', color: TEXT_COLOR }}>{name}</h4>
        <p style={{ color: PURPLE_ACCENT, fontWeight: 'bold' }}>{count} Laporan Aktif</p>
    </div>
);

const CategorySection = () => (
    <section style={{ padding: '3rem 0', backgroundColor: '#FFFFFF' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ color: TEXT_COLOR }}>Kategori Laporan</h2>
            <div style={{ display: 'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginTop: '2rem' }}>
                {categories.map((cat) => (
                    <CategoryCard key={cat.name} name={cat.name} count={cat.count} />
                ))}
            </div>
        </div>
    </section>
);

// 5. Dean's Message
const DeanMessage = () => (
    <section style={{ padding: '3rem 0', backgroundColor: '#F3F0FF', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <blockquote style={{ 
                fontStyle: 'italic', 
                fontSize: '1.4rem', 
                color: TEXT_COLOR,
                lineHeight: '1.6'
            }}>
                "Kami di FTI UII berdedikasi penuh untuk menjembatani suara Anda. Melalui Lapor FTI, kami memastikan setiap aspirasi didengar, ditindaklanjuti, dan direspons dengan integritas serta kehangatan."
            </blockquote>
            <p style={{ marginTop: '1.5rem', fontSize: '1.1rem', fontWeight: 'bold', color: PURPLE_ACCENT }}>
                — Dekanat FTI UII
            </p>
        </div>
    </section>
);


// --- Main Page Component ---
const LandingPage = () => {
    return (
        <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: LIGHT_BG, minHeight: '100vh' }}>
            <Header />
            <TicketTracker />
            <TrustSection />
            <CategorySection />
            <DeanMessage />
        </div>
    );
};

export default LandingPage;