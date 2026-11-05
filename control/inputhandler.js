
const keys = {
  left: false,
  right: false
};

let jumpRequested = false;

function setKey(key, isDown) {
  const lowerKey = key.toLowerCase();

  if (key === "ArrowLeft" || lowerKey === "a") {
    keys.left = isDown;
  }

  if (key === "ArrowRight" || lowerKey === "d") {
    keys.right = isDown;
  }

  if (
    key === "ArrowUp" ||
    key === " " ||
    lowerKey === "w"
  ) {
    if (isDown) jumpRequested = true;
  }
}

window.addEventListener("keydown", event => {
  const controlledKeys = [
    "ArrowLeft", "ArrowRight", "ArrowUp", " "
  ];

  if (controlledKeys.includes(event.key)) {
    event.preventDefault();
  }

  if (!event.repeat) {
    setKey(event.key, true);
  }
});

window.addEventListener("keyup", event => {
  setKey(event.key, false);
});

function releaseAllControls() {
  keys.left = false;
  keys.right = false;
}

window.addEventListener("blur", releaseAllControls);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) releaseAllControls();
});

function bindHoldButton(id, keyName) {
  const button = document.getElementById(id);
  if (!button) return;

  button.addEventListener("pointerdown", event => {
    event.preventDefault();

    if (keyName === "jump") {
      jumpRequested = true;
    } else {
      keys[keyName] = true;
    }

    if (button.setPointerCapture) {
      button.setPointerCapture(event.pointerId);
    }
  });

  function release(event) {
    if (event) event.preventDefault();

    if (keyName !== "jump") {
      keys[keyName] = false;
    }
  }

  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
}

bindHoldButton("leftBtn", "left");
bindHoldButton("rightBtn", "right");
bindHoldButton("jumpBtn", "jump");
