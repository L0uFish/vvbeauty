import HeroCarousel from "./components/HeroCarousel";
import ActionButtons from "./components/ActionButtons";
import "./styles/home.css";
import Header from "./components/Header";

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
    </main>
  );
}
