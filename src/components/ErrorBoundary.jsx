import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props){ super(props); this.state = { hasError: false, err: null }; }
  static getDerivedStateFromError(err){ return { hasError: true, err }; }
  componentDidCatch(err, info){ console.error("ErrorBoundary caught:", err, info); }
  render(){
    if (this.state.hasError) {
      return (
        <div style={{padding:16,fontFamily:"sans-serif"}}>
          <h2>Something went wrong.</h2>
          <pre style={{whiteSpace:"pre-wrap"}}>{String(this.state.err)}</pre>
          <button onClick={()=>location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
