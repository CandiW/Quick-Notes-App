//front-end javascript file
import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import RandomColor from 'randomcolor'


class Notes extends Component {
  //this is for displaying notes
    render(){

      return (
        <div className="grid-item" style={this.props.colorTheme}>
        <p>{this.props.text}</p>
        <p>{this.props.date}</p>
        </div>
      )
    }

}

let defaultStyle = {
  backgroundColor: RandomColor(),
  opacity: ".7",
  borderLeft: "5px solid " + RandomColor(),
  color: "black"
};

class NewNote extends Component {
//this is for creating a new note only
//need post request for this one
//need to clear textarea upon submit or cancel

constructor(){
  super();
  this.state = {
     text: ""
  };
  this.handleSubmitText = this.handleSubmitText.bind(this);
  this.addNote = this.addNote.bind(this);
}

handleSubmitText(e){
  e.preventDefault();
  this.setState({text: e.target.value});
  let text = this.state.text;

}

addNote(e){
  e.preventDefault();
  this.setState({text: e.target.value});
  fetch('mongodb://'+process.env.USER+':'+process.env.PASS+'@'+process.env.HOST+':'+process.env.PORT+'/'+process.env.DB, {
    method: 'POST',
    body: JSON.stringify(text),
    headers: new Headers({
      'Content-Type': 'application/json'
    })
  }).then(res => res.json())
  .catch(error => {
    console.error('Error:', error);
    this.setState({text: ""});
  })
  .then(response => {
    console.log('Success:', response);
    this.setState({text: ""});
  });  

}

    render(){
      return (
        <div id="form-container" className='container-fluid' style={defaultStyle}>
          <div id="form">
            <div className="form-group">
            <form>
              <label htmlFor="newNote">New Note:</label>
                <input type="text" name="text" className="form-control" rows="5" id="text" placeholder="Write your note here..." onChange={this.handleSubmitText} value={this.state.text}></input>
                <button id="done" type="submit" className="btn btn-primary pull-right" onClick={this.addNote}>Done</button>
                <button id="cancel" className="btn btn-warning pull-right">Cancel</button>
            </form>
            </div>
          </div>
        </div>
      )
    }

}

class App extends Component {

  constructor(){
    super();
    this.state = {
       showHide: false,
       colorTheme: defaultStyle,
       myNotes: []
    };
    this.showHide = this.showHide.bind(this);
    this.colorTheme = this.colorTheme.bind(this);
    this.fetchMyNotes = this.fetchMyNotes.bind(this);
 }
 
componentDidMount(){
  //uncomment this when ready!!

  /*
  this.fetchMyNotes();
  */
}

 fetchMyNotes(){
   //will not fetch from local db, needs to be http
    fetch('mongodb://'+process.env.USER+':'+process.env.PASS+'@'+process.env.HOST+':'+process.env.PORT+'/'+process.env.DB, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
  })
  .then((response) => response.json())
  .then((responseJson) => {
    if (responseJson.success) {
      this.setState({myNotes: responseJSON})
      console.log(this.state.myNotes);
    }
    else this.setState({myNotes: responseJSON})
    console.log(this.state.myNotes);
  })
  .catch((error) => {
    console.error(error);
  });

 }
 

 colorTheme(selection){
    let style;
    if (selection === "dark"){
      style = {
        //dark grey
        backgroundColor: "#6E828A",
        borderLeft: "5 px solid " + RandomColor(),
        opacity: ".7",
        color: "white"
      };
    this.setState({colorTheme: style});
    }
    else if (selection === "purple"){
      style = {
        backgroundColor: "#780662",
        borderLeft: "5px solid " + RandomColor(),
        opacity: ".7",
        color: "white"
      };
    this.setState({colorTheme: style});
    }
    else if (selection === "surpriseme"){
      let color = RandomColor();
      style = {
        backgroundColor: color,
        opacity: ".7",
        borderLeft: "5px solid " + RandomColor()
      };
    this.setState({colorTheme: style});   
    }
    else if (selection === "light"){
      style = {
        //light blue color
        backgroundColor: "#0D8ABC",
        borderLeft: "5px solid " + RandomColor(),
        opacity: ".7",
        color: "black"
      };
    this.setState({colorTheme: style});
    }
    else {
      style = {
        backgroundColor: "yellow",
        borderLeft: "5px solid " + RandomColor(),
        opacity: ".7",
        color: "black"
      }; 
      this.setState({colorTheme: style});
    }
 }

  showHide(){
    this.setState({showHide: !this.state.showHide});
  }

  render(){
    let noteStyle = this.state.colorTheme;
    let notes = this.state.myNotes;

    return (
      <div className='container-fluid'>
        <h1 className='text-center'>Quick Notes App</h1>
        <h2></h2>
        <div className='text-center'>
          Choose a color theme: 
          <button id="dark-theme" className="btn" onClick={() => this.colorTheme("dark")}>Dark</button>
          <button id="light-theme" className="btn" onClick={() => this.colorTheme("light")}>Light</button>
          <button id="purple-theme" className="btn" onClick={() => this.colorTheme("purple")}>Purple</button>
          <button id="surpriseme-theme" className="btn" onClick={() => this.colorTheme("surpriseme")}>Surprise Me!</button>
        </div>
        <div className="text-center"><button className="btn btn-default" onClick={this.fetchMyNotes}>Fetch My Notes</button></div>
        <div className='text-center'><p className="new-note">Create New Note <i className="btn fa fa-plus-circle" onClick={this.showHide}></i></p></div>
        <NewNote style={this.state.colorTheme} />
        <div>
            <Notes text="Hello" date="4/11/18" colorTheme={this.state.colorTheme}/>
            {
              notes.forEach((el) => {
                return <Notes text={el.text} date={el.date} colorTheme={this.state.colorTheme} />
              })
            }
        </div>
    </div>
    )
  }
}

ReactDOM.render(<App />, document.getElementById('app'));
