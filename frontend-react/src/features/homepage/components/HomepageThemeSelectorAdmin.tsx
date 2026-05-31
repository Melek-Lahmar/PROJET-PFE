import { useState } from "react";
import { HOMEPAGE_THEMES, getAllThemes, type HomepageThemeId, type HomepageThemeConfig } from "../themes/HomepageThemes";
import { Button } from "../../../shared/components/Button";

interface HomepageThemeSelectorAdminProps {
  currentThemeId: HomepageThemeId;
  onThemeChange: (themeId: HomepageThemeId) => void;
  saving?: boolean;
}

function ThemeCard({
  theme,
  isSelected,
  onSelect
}: {
  theme: HomepageThemeConfig;
  isSelected: boolean;
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        relative overflow-hidden rounded-2xl border-2 p-4 transition-all text-left
        ${isSelected
          ? 'border-primary shadow-lg ring-2 ring-primary/30'
          : 'border-border hover:border-border/80 bg-card'
        }
      `}
    >
      {/* Aperçu couleurs */}
      <div className="mb-3 flex h-16 gap-2">
        <div
          className="flex-1 rounded-lg"
          style={{ backgroundColor: theme.colors.primary }}
          title="Couleur primaire"
        />
        <div
          className="flex-1 rounded-lg"
          style={{ backgroundColor: theme.colors.secondary }}
          title="Couleur secondaire"
        />
        <div
          className="flex-1 rounded-lg"
          style={{ backgroundColor: theme.colors.accent }}
          title="Couleur accentuation"
        />
      </div>

      {/* Nom et description */}
      <h3 className="font-bold text-card-foreground">{theme.name}</h3>
      <p className="text-xs text-muted-foreground mt-1">{theme.description}</p>

      {/* Caractéristiques */}
      <div className="mt-2 flex flex-wrap gap-1">
        {theme.specialFeatures.hasGradient && (
          <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-1 rounded">Gradient</span>
        )}
        {theme.specialFeatures.hasAnimation && (
          <span className="text-[10px] bg-info/15 text-info px-2 py-1 rounded">Animation</span>
        )}
        {theme.specialFeatures.hasDarkMode && (
          <span className="text-[10px] bg-muted text-muted-foreground px-2 py-1 rounded">Dark</span>
        )}
      </div>

      {/* Badge sélectionné */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">
          ✓
        </div>
      )}
    </button>
  );
}

function ThemeDetailPanel({ theme }: { theme: HomepageThemeConfig }) {
  return (
    <div className="space-y-6 p-6 bg-muted/30 rounded-2xl border border-border/60">
      <div>
        <h3 className="font-bold text-lg text-card-foreground mb-2">{theme.name}</h3>
        <p className="text-muted-foreground">{theme.description}</p>
      </div>

      {/* Couleurs */}
      <div>
        <h4 className="font-semibold text-card-foreground mb-2">Palette de couleurs</h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(theme.colors).map(([key, color]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded border border-border/60"
                style={{ backgroundColor: color }}
              />
              <div>
                <p className="text-xs font-medium text-card-foreground">{key}</p>
                <p className="text-xs text-muted-foreground">{color}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Boutons */}
      <div>
        <h4 className="font-semibold text-card-foreground mb-3">Styles de boutons</h4>
        <div className="space-y-3">
          {Object.entries(theme.buttons).map(([type, buttonStyle]) => (
            <div key={type} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground capitalize">{type}</p>
              <button
                type="button"
                style={{
                  backgroundColor: buttonStyle.bg,
                  color: buttonStyle.text,
                  borderRadius: theme.borderRadius.button,
                }}
                className="w-full px-4 py-2 font-semibold transition hover:opacity-80"
              >
                {type.charAt(0).toUpperCase() + type.slice(1)} Button
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-card-foreground mb-2 text-sm">Catégories</h4>
          <p className="text-xs text-muted-foreground">
            Layout: <strong className="text-card-foreground">{theme.categoriesLayout}</strong>
            <br />
            Par ligne: <strong className="text-card-foreground">{theme.categoriesPerRow}</strong>
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-card-foreground mb-2 text-sm">Articles</h4>
          <p className="text-xs text-muted-foreground">
            Affichage: <strong className="text-card-foreground">{theme.productsDisplay}</strong>
            <br />
            Style: <strong className="text-card-foreground">{theme.productCardStyle}</strong>
          </p>
        </div>
      </div>

      {/* Espacement et Border Radius */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-card-foreground mb-2 text-sm">Espacement</h4>
          <p className="text-xs text-muted-foreground">
            Section: <strong className="text-card-foreground">{theme.spacing.sectionGap}</strong>
            <br />
            Item: <strong className="text-card-foreground">{theme.spacing.itemGap}</strong>
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-card-foreground mb-2 text-sm">Coins arrondis</h4>
          <p className="text-xs text-muted-foreground">
            Bouton: <strong className="text-card-foreground">{theme.borderRadius.button}</strong>
            <br />
            Carte: <strong className="text-card-foreground">{theme.borderRadius.card}</strong>
          </p>
        </div>
      </div>

      {/* Typographie */}
      <div>
        <h4 className="font-semibold text-card-foreground mb-2 text-sm">Typographie</h4>
        <p className="text-xs text-muted-foreground">
          Police: <strong className="text-card-foreground">{theme.typography.fontFamily}</strong>
          <br />
          Poids titres: <strong className="text-card-foreground">{theme.typography.headingWeight}</strong>
          <br />
          Poids corps: <strong className="text-card-foreground">{theme.typography.bodyWeight}</strong>
        </p>
      </div>
    </div>
  );
}

export function HomepageThemeSelectorAdmin({
  currentThemeId,
  onThemeChange,
  saving = false,
}: HomepageThemeSelectorAdminProps) {
  const [previewThemeId, setPreviewThemeId] = useState<HomepageThemeId>(currentThemeId);
  const themes = getAllThemes();
  const currentTheme = HOMEPAGE_THEMES[currentThemeId];
  const previewTheme = HOMEPAGE_THEMES[previewThemeId];

  return (
    <div className="space-y-6 p-6 bg-card rounded-3xl border border-border">
      {/* Titre */}
      <div>
        <h2 className="text-2xl font-bold text-card-foreground">Thèmes de la Homepage</h2>
        <p className="text-muted-foreground mt-1">
          Sélectionnez un thème pour changer les couleurs, les layouts et l'affichage
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Grille thèmes */}
        <div className="col-span-2">
          <h3 className="font-semibold text-card-foreground mb-3">Thèmes disponibles</h3>
          <div className="grid grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
            {themes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                isSelected={previewThemeId === theme.id}
                onSelect={() => setPreviewThemeId(theme.id)}
              />
            ))}
          </div>

          {/* Boutons d'action */}
          <div className="mt-4 flex gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                onThemeChange(previewThemeId);
                setPreviewThemeId(previewThemeId);
              }}
              disabled={saving || previewThemeId === currentThemeId}
            >
              {saving ? "Sauvegarde..." : "Appliquer ce thème"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewThemeId(currentThemeId)}
            >
              Réinitialiser
            </Button>
          </div>
        </div>

        {/* Aperçu détail */}
        <div>
          <h3 className="font-semibold text-card-foreground mb-3">Aperçu du thème</h3>
          <ThemeDetailPanel theme={previewTheme} />
        </div>
      </div>

      {/* Thème actuel */}
      <div className="p-4 bg-info/10 border border-info/25 rounded-xl">
        <p className="text-sm text-info">
          <strong>Thème actuel:</strong> {currentTheme.name}
        </p>
      </div>
    </div>
  );
}

// Composant simple pour afficher les thèmes en grille seule
export function HomepageThemeGrid({
  currentThemeId,
  onSelect,
}: {
  currentThemeId: HomepageThemeId;
  onSelect: (themeId: HomepageThemeId) => void;
}) {
  const themes = getAllThemes();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {themes.map((theme) => (
        <ThemeCard
          key={theme.id}
          theme={theme}
          isSelected={currentThemeId === theme.id}
          onSelect={() => onSelect(theme.id)}
        />
      ))}
    </div>
  );
}
