import { Link } from "react-router-dom";
import { CartIconButton } from "../../shared/components/CartIconButton";

export function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-row">
        <Link to="/" className="brand">
          Melek Shop
        </Link>

        <nav className="flex items-center gap-3">
          <Link to="/categories" className="btn btn-outline">
            Catégories
          </Link>
          <Link to="/articles" className="btn btn-outline">
            Articles
          </Link>

          <CartIconButton />
        </nav>
      </div>
    </header>
  );
}
