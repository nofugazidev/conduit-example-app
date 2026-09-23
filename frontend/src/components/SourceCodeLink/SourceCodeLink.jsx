function SourceCodeLink({ left, right }) {
  const position = left ? "left" : right ? "right" : "";

  return (
    <ul className={`nav navbar-nav pull-xs-${position}`}>
      <li className="nav-item">
        <a
          className="nav-link"
          // href="https://github.com/TonyMckes/conduit-realworld-example-app"
          href="https://github.com/nofugazidev/conduit-example-app"
          //so, i changed this link to just go to my repo  in case you are trying to check the source code
        >
          <i className="ion-social-github"></i> Source code
        </a>
      </li>
    </ul>
  );
}

export default SourceCodeLink;
