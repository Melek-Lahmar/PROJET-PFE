// ============================================================
// FICHIER: HomepageThemeSelectorAdmin.tsx
// CHEMIN: frontend-react/src/features/homepage/components/HomepageThemeSelectorAdmin.tsx
//
// Description: Composant admin pour sélectionner et prévisualiser les thèmes
// ============================================================

import React, { useState } from "react";
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
        relative overflow-hidden rounded-2xl border-2 p-4 transition-all
        ${isSelected 
          ? 'border-blue-500 shadow-lg ring-2 ring-blue-300' 
          : 'border-gray-200 hover:border-gray-300'
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
      <h3 className="font-bold text-gray-900">{theme.name}</h3>
      <p className="text-xs text-gray-600 mt-1">{theme.description}</p>

      {/* Caractéristiques */}
      <div className="mt-2 flex flex-wrap gap-1">
        {theme.specialFeatures.hasGradient && (
          <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded">Gradient</span>
        )}
        {theme.specialFeatures.hasAnimation && (
          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded">Animation</span>
        )}
        {theme.specialFeatures.hasDarkMode && (
          <span className="text-[10px] bg-gray-800 text-white px-2 py-1 rounded">Dark</span>
        )}
      </div>

      {/* Badge sélectionné */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center">
          ✓
        </div>
      )}
    </button>
  );
}

function ThemeDetailPanel({ theme }: { theme: HomepageThemeConfig }) {
  return (
    <div className="space-y-6 p-6 bg-gray-50 rounded-2xl">
      <div>
        <h3 className="font-bold text-lg text-gray-900 mb-2">{theme.name}</h3>
        <p className="text-gray-600">{theme.description}</p>
      </div>

      {/* Couleurs */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-2">Palette de couleurs</h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(theme.colors).map(([key, color]) => (
            <div key={key} className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded border border-gray-300" 
                style={{ backgroundColor: color }}
              />
              <div>
                <p className="text-xs font-medium text-gray-700">{key}</p>
                <p className="text-xs text-gray-500">{color}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Boutons */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Styles de boutons</h4>
        <div className="space-y-3">
          {Object.entries(theme.buttons).map(([type, buttonStyle]) => (
            <div key={type} className="space-y-1">
              <p className="text-xs font-medium text-gray-700 capitalize">{type}</p>
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
          <h4 className="font-semibold text-gray-900 mb-2 text-sm">Catégories</h4>
          <p className="text-xs text-gray-600">
            Layout: <strong>{theme.categoriesLayout}</strong>
            <br />
            Par ligne: <strong>{theme.categoriesPerRow}</strong>
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 mb-2 text-sm">Articles</h4>
          <p className="text-xs text-gray-600">
            Affichage: <strong>{theme.productsDisplay}</strong>
            <br />
            Style: <strong>{theme.productCardStyle}</strong>
          </p>
        </div>
      </div>

      {/* Espacement et Border Radius */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-gray-900 mb-2 text-sm">Espacement</h4>
          <p className="text-xs text-gray-600">
            Section: <strong>{theme.spacing.sectionGap}</strong>
            <br />
            Item: <strong>{theme.spacing.itemGap}</strong>
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 mb-2 text-sm">Coins arrondis</h4>
          <p className="text-xs text-gray-600">
            Bouton: <strong>{theme.borderRadius.button}</strong>
            <br />
            Carte: <strong>{theme.borderRadius.card}</strong>
          </p>
        </div>
      </div>

      {/* Typographie */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-2 text-sm">Typographie</h4>
        <p className="text-xs text-gray-600">
          Police: <strong>{theme.typography.fontFamily}</strong>
          <br />
          Poids titres: <strong>{theme.typography.headingWeight}</strong>
          <br />
          Poids corps: <strong>{theme.typography.bodyWeight}</strong>
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
    <div className="space-y-6 p-6 bg-white rounded-3xl border border-gray-200">
      {/* Titre */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Thèmes de la Homepage</h2>
        <p className="text-gray-600 mt-1">
          Sélectionnez un thème pour changer les couleurs, les layouts et l'affichage
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Grille thèmes */}
        <div className="col-span-2">
          <h3 className="font-semibold text-gray-900 mb-3">Thèmes disponibles</h3>
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
          <h3 className="font-semibold text-gray-900 mb-3">Aperçu du thème</h3>
          <ThemeDetailPanel theme={previewTheme} />
        </div>
      </div>

      {/* Thème actuel */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-blue-900">
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
