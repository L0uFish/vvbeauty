import HeroCarousel from "./components/HeroCarousel";
import ActionButtons from "./components/ActionButtons";
import Header from "./components/LoginBtn";
import BrownieEasterEgg from "./components/BrownieEasterEgg";
import DecemberPromo from "./components/christmas/DecemberPromo";
import SnowfallEffect from "./components/christmas/SnowfallEffect";
import SantaFlyover from "./components/christmas/SantaFlyover";

import "./styles/home.css";
import "./styles/HeroCarousel.css";

export default function Home() {
  return (
    <main className="home-container">
      <Header />

      <section className="hero-section">
        <HeroCarousel />
        <SnowfallEffect /> {/* ❄️ actual physics-based snow piling */}
        <div className="hero-overlay">
          <h1 className="hero-title">VVBeauty</h1>
          <p className="hero-subtitle">Nagels & Wimpers</p>
        </div>
      </section>



      <section className="action-section">
        <SantaFlyover />
        <ActionButtons />
      </section>

      <BrownieEasterEgg />
      <DecemberPromo />
    </main>
  );
}
