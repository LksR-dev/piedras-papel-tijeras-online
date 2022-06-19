import { Router } from "@vaadin/router";
import { state } from "../../state";

class EnterRoom extends HTMLElement {
  shadow: ShadowRoot;
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    const style: HTMLElement = document.createElement("style");
    style.innerHTML = `
      .container {
        margin: 20px auto 0;
        width: 90%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        height: 100vh;
      }
      @media only screen and (min-width: 768px) {
        .container {
          margin: 40px auto 0;
        }
      }
      .container__hand {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
      }
      .form {
        display: flex;
        flex-direction: column;
      }
    `;
    this.shadow.appendChild(style);
  }
  addListeners() {
    const startBtn = this.shadow.querySelector("#start");

    startBtn.addEventListener("click", e => {
      const inputId = this.shadow
        .querySelector(".input-form")
        .shadowRoot.querySelector("input").value;

      if (inputId != "") {
        state.createUser(() => {
          Router.go("/instructions");
        }, inputId);
      } else {
        alert("Debes ingresar un ID.");
      }
    });
  }

  connectedCallback() {
    this.render();
  }
  render() {
    const div: HTMLElement = document.createElement("div");
    div.classList.add("container");
    div.innerHTML = `
      <text-custom size="80px" weight="700" color="#009048" lineHeight="1">Piedra Papel o Tijeras</text-custom>

      <form class="form">
        <input-comp class="input-form" type="text" placeholder="1458" required="true"></input-comp>
        <btn-comp id="start" mt="15px">Continuar</btn-comp>
      </form>

      <div class="container__hand">
        <hands-comp hand="stone"></hands-comp>
        <hands-comp hand="paper"></hands-comp>
        <hands-comp hand="scissors"></hands-comp>
      </div>
    `;
    this.shadow.appendChild(div);
    this.addListeners();
  }
}
customElements.define("enterid-page", EnterRoom);
