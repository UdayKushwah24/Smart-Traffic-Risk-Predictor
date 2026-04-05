export default function ParticlesBg() {
  return (
    <div className="particles-bg">
      {Array.from({ length: 20 }, (_, i) => (
        <div className="particle" key={i}></div>
      ))}
    </div>
  );
}
