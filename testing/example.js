jasync function f() {
  console.log(1);
  if (g()) {
    console.log(2);
  }
}

function g() {
  return true;
}

f();
