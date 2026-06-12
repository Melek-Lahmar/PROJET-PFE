import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SHIPPING_HOME, useCartStore } from "./cartStore";

function resetCart() {
  useCartStore.setState({
    items: [],
    deliveryMode: "HOME",
    shippingHomeFee: DEFAULT_SHIPPING_HOME,
  });
}

describe("cartStore shipping", () => {
  beforeEach(() => {
    localStorage.clear();
    resetCart();
  });

  it("uses the dynamic HOME delivery fee", () => {
    const cart = useCartStore.getState();
    cart.addItem({ arRef: "A1", designation: "Article", unitPrice: 10 }, 2);
    cart.setShippingHomeFee(9.5);
    cart.setDeliveryMode("HOME");

    expect(useCartStore.getState().shipping()).toBe(9.5);
  });

  it("uses 0 delivery fee for PICKUP", () => {
    const cart = useCartStore.getState();
    cart.addItem({ arRef: "A1", designation: "Article", unitPrice: 10 }, 1);
    cart.setShippingHomeFee(9.5);
    cart.setDeliveryMode("PICKUP");

    expect(useCartStore.getState().shipping()).toBe(0);
  });

  it("uses 0 delivery fee for an empty cart", () => {
    useCartStore.getState().setShippingHomeFee(9.5);

    expect(useCartStore.getState().shipping()).toBe(0);
  });

  it("computes total as subtotal plus shipping plus stamp", () => {
    const cart = useCartStore.getState();
    cart.addItem({ arRef: "A1", designation: "Article", unitPrice: 20 }, 2);
    cart.setShippingHomeFee(9.5);
    cart.setDeliveryMode("HOME");

    expect(useCartStore.getState().subtotal()).toBe(40);
    expect(useCartStore.getState().stamp()).toBe(1);
    expect(useCartStore.getState().total()).toBe(50.5);
  });
});
