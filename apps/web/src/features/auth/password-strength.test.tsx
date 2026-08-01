import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PasswordStrength } from "./password-strength";

/**
 * Ce composant est le point où la règle métier devient visible pour
 * l'utilisateur. Ce qu'on vérifie ici n'est pas l'apparence mais la
 * **cohérence avec la validation serveur** : l'utilisateur ne doit jamais voir
 * un mot de passe présenté comme solide alors que le serveur le refusera.
 */
describe("PasswordStrength", () => {
  it("n'affiche rien tant qu'aucun mot de passe n'est saisi", () => {
    const { container } = render(<PasswordStrength password="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("annonce une robustesse nulle pour un mot de passe courant", () => {
    render(<PasswordStrength password="motdepasse1" />);
    expect(screen.getByText(/Très faible/)).toBeInTheDocument();
    expect(screen.getByText(/trop courant/i)).toBeInTheDocument();
  });

  it("valorise une phrase de passe longue", () => {
    render(<PasswordStrength password="le chat dort sur le radiateur" />);
    expect(screen.getByText(/Excellent/)).toBeInTheDocument();
    // Aucun problème signalé : le serveur l'acceptera.
    expect(screen.queryByText(/caractères\./)).not.toBeInTheDocument();
  });

  it("signale un mot de passe contenant l'adresse e-mail", () => {
    render(<PasswordStrength password="alexnville-super" email="alexnville@gmail.com" />);
    expect(screen.getByText(/adresse e-mail/i)).toBeInTheDocument();
  });

  it("annonce le résultat aux lecteurs d'écran sans interrompre la saisie", () => {
    render(<PasswordStrength password="bonjourlala" />);
    const live = screen.getByText(/Robustesse/).closest("p");
    // `polite` et non `assertive` : une interruption à chaque frappe rendrait
    // le champ inutilisable au lecteur d'écran.
    expect(live).toHaveAttribute("aria-live", "polite");
  });

  it("ne porte pas l'information par la seule couleur", () => {
    // Les barres colorées sont aria-hidden ; le libellé textuel porte le sens.
    render(<PasswordStrength password="bonjourlala" />);
    expect(screen.getByText(/Robustesse : /)).toBeInTheDocument();
  });
});
