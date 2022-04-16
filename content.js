class State {
  static DEFAULT = "DEFAULT";
  static SELECTOR_PRESSED = "SELECTOR_PRESSED";
}

class Keys {
  static INSIDE = "i";
  static AROUND = "a";

  static DEFAULT_CHAR = '"';
  static LINE_CHAR = "s";
}

function getRightAndLeftChar(key) {
  if (key == Keys.INSIDE || key == Keys.AROUND) {
    key = Keys.DEFAULT_CHAR;
  }

  const lineChar = Keys.LINE_CHAR;

  allowedChars = {
    "(": ")",
    "[": "]",
    "{": "}",
    "'": "'",
    '"': '"',
    s: "s",
  };

  if (key in allowedChars) {
    return { leftChar: key, rightChar: allowedChars[key] };
  }

  for (left in allowedChars) {
    if (allowedChars[left] == key) {
      return { leftChar: left, rightChar: key };
    }
  }

  throw "Invalid Character for yank";
}

class Command {
  selector = "";
  character = "";

  reset() {
    this.selector = "";
    this.character = "";
  }
}

class Handler {
  state = State.DEFAULT;
  command = new Command();

  constructor() {
    window.addEventListener("keydown", (event) => {
      console.log(event);

      let selection = window.getSelection();
      // this.func(selection.anchorNode);
      if (
        selection.type === "Caret" ||
        event.ctrlKey ||
        event.key === "Shift"
      ) {
        return;
      }

      const stateBefore = this.state;
      switch (this.state) {
        case State.DEFAULT:
          this.handleSelector(event);
          break;
        case State.SELECTOR_PRESSED:
          this.handleCharacter(event);
          break;
        default:
          this.reset();
          return;
      }

      // if stays in same state for 2 seconds then reset
      setTimeout(() => {
        if (this.state === stateBefore) {
          this.reset();
        }
      }, 2000);
    });
  }

  handleSelector(event) {
    if (event.key !== Keys.INSIDE && event.key !== Keys.AROUND) {
      return;
    }

    this.state = State.SELECTOR_PRESSED;
    this.command.selector = event.key;
  }

  handleCharacter(event) {
    this.command.character = event.key;

    const selection = window.getSelection();

    try {
      const { leftChar, rightChar } = getRightAndLeftChar(
        this.command.character
      );

      const yankedText = this.search(
        selection.anchorNode,
        selection.baseOffset,
        selection.extentOffset,
        leftChar,
        rightChar
      );
      navigator.clipboard.writeText(yankedText);

      console.log(`yanked text is ${yankedText}`);
    } catch (error) {
      console.log(error);
    }

    this.reset();
  }

  search(selectedNode, leftIdx, rightIdx, leftChar, rightChar = null) {
    rightChar = rightChar === null ? leftChar : rightChar;

    const { text, offset } = this.getBaseTextAndOffset(selectedNode);
    leftIdx += offset;
    rightIdx += offset;

    if (leftChar === Keys.LINE_CHAR) {
      return text;
    }

    // console.log(`text is ${text.substring(leftIdx, rightIdx)}`);
    let leftBoundary = -1,
      rightBoundary = -1;

    while (leftIdx >= 0 || rightIdx < text.length) {
      if (leftBoundary === -1 && text[leftIdx--] === leftChar)
        leftBoundary = leftIdx + 1;

      if (rightBoundary === -1 && text[rightIdx++] === rightChar)
        rightBoundary = rightIdx - 1;

      if (leftBoundary !== -1 && rightBoundary !== -1) {
        break;
      }
    }

    if (leftBoundary === -1 || rightBoundary === -1) {
      throw "Yank not possible";
    }

    if (this.command.selector == Keys.INSIDE) {
      leftBoundary++;
      rightBoundary--;
    }

    return text.substring(leftBoundary, rightBoundary + 1);
  }

  getBaseTextAndOffset(selectedNode) {
    const terminalNode = this.findFirstTerminalParentNode(selectedNode);
    const texts = [];
    let found = false;
    let offset = 0;

    const helper = (node) => {
      if (node === selectedNode) {
        found = true;
      }

      if (node.childNodes.length == 0 && "wholeText" in node) {
        let cnt = found ? 0 : node.wholeText.length;
        offset += cnt;

        texts.push(node.wholeText);
      }

      for (const childNode of node.childNodes) {
        if (helper(childNode)) {
          return true;
        }
      }

      return false;
    };
    helper(terminalNode);

    const text = texts.join("");
    return { text, offset };
  }

  findFirstTerminalParentNode(node) {
    const terminalNodes = ["DIV", "PRE", "CODE", "TD", "BODY"];

    if (terminalNodes.includes(node.nodeName)) {
      return node;
    }

    return this.findFirstTerminalParentNode(node.parentNode);
  }

  reset() {
    this.state = State.DEFAULT;
    this.command.reset();
  }
}

new Handler();
