import HeroCarousel from "./components/home/HeroCarousel";
import ActionButtons from "./components/home/ActionButtons";
import "./styles/home/homebtns.css";
import Header from "./components/home/LoginBtn";
import BrownieEasterEgg from "./components/easterEggs/BrownieEasterEgg";

export default function Home() {
  return (
    <main className="home-container">
      <Header />
      <section className="hero-section">
        <HeroCarousel />
        <div className="hero-overlay">
          <h1 className="hero-title">VVBeauty</h1>
          <p className="hero-subtitle">Nagels & Wimpers</p>
        </div>
      </section>

      <section className="action-section">
        <ActionButtons />
      </section>
      <BrownieEasterEgg />
    </main>
  );
}
