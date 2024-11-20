import { ConnectKitButton } from "connectkit";
import React from "react";

const Header = () => {
  return (
    <header className="header">
      <div className="logo">Shido Examples</div>
      <div className="connect-wallet">
        <ConnectKitButton />
      </div>
    </header>
  );
};

export default Header;
