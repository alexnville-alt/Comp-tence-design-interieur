import { beforeEach, describe, expect, it } from "vitest";
import { emptyScene, type FurnitureItem } from "@atelier/domain";
import { KEYBOARD_STEP_CM, ROTATE_STEP_DEG, useStudioStore } from "./store";

const sofa: FurnitureItem = {
  id: "sofa-1",
  label: "Canapé",
  footprint: { w: 200, d: 90, h: 85 },
  position: { x: 100, y: 100 },
  rotation: 0,
};

beforeEach(() => {
  useStudioStore.getState().loadScene(emptyScene());
});

describe("useStudioStore — mobilier", () => {
  it("ajoute puis sélectionne un meuble", () => {
    useStudioStore.getState().addFurniture(sofa);
    useStudioStore.getState().select(sofa.id, "furniture");
    const state = useStudioStore.getState();
    expect(state.scene.furniture).toHaveLength(1);
    expect(state.selectedId).toBe(sofa.id);
  });

  it("déplace le meuble sélectionné par pas exact de 1/10 cm, sans arrondi de grille", () => {
    // Le magnétisme de grille (10 cm par défaut) ne doit jamais annuler ce
    // pas fin : c'est la précision clavier exigée par docs/03 §6.
    useStudioStore.getState().addFurniture(sofa);
    useStudioStore.getState().select(sofa.id, "furniture");
    useStudioStore.getState().moveSelected(KEYBOARD_STEP_CM, 0);
    const moved = useStudioStore.getState().scene.furniture[0]!;
    expect(moved.position.x).toBeCloseTo(100.1);
    expect(moved.position.y).toBe(100);
  });

  it("pivote le meuble sélectionné par pas de 15°", () => {
    useStudioStore.getState().addFurniture(sofa);
    useStudioStore.getState().select(sofa.id, "furniture");
    useStudioStore.getState().rotateSelected(ROTATE_STEP_DEG);
    expect(useStudioStore.getState().scene.furniture[0]!.rotation).toBe(15);
  });

  it("supprime le meuble sélectionné et efface la sélection", () => {
    useStudioStore.getState().addFurniture(sofa);
    useStudioStore.getState().select(sofa.id, "furniture");
    useStudioStore.getState().removeSelected();
    const state = useStudioStore.getState();
    expect(state.scene.furniture).toHaveLength(0);
    expect(state.selectedId).toBeNull();
  });
});

describe("useStudioStore — annuler/refaire", () => {
  it("annule un ajout puis le rejoue", () => {
    useStudioStore.getState().addFurniture(sofa);
    expect(useStudioStore.getState().scene.furniture).toHaveLength(1);

    useStudioStore.getState().undo();
    expect(useStudioStore.getState().scene.furniture).toHaveLength(0);

    useStudioStore.getState().redo();
    expect(useStudioStore.getState().scene.furniture).toHaveLength(1);
  });

  it("une nouvelle action après un annuler efface la pile de refaire", () => {
    useStudioStore.getState().addFurniture(sofa);
    useStudioStore.getState().undo();
    useStudioStore.getState().addFurniture({ ...sofa, id: "sofa-2" });
    expect(useStudioStore.getState().future).toHaveLength(0);
  });
});

describe("useStudioStore — murs et ouvertures", () => {
  it("supprimer un mur retire aussi ses ouvertures", () => {
    useStudioStore.getState().addWall({
      id: "w0",
      a: { x: 0, y: 0 },
      b: { x: 400, y: 0 },
      thickness: 10,
      structural: false,
    });
    useStudioStore.getState().addOpening({
      id: "d0",
      wallId: "w0",
      kind: "door",
      offsetCm: 50,
      widthCm: 90,
      heightCm: 204,
      sillCm: 0,
    });
    useStudioStore.getState().removeWall("w0");
    const state = useStudioStore.getState();
    expect(state.scene.walls).toHaveLength(0);
    expect(state.scene.openings).toHaveLength(0);
  });
});
