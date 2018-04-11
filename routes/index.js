//front-end javascript file
import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import MasonryJS from 'masonry-layout'
import RandomColor from 'randomcolor'

/*
Vanilla JS example from Masonry.js

var elem = document.querySelector('.grid');
var msnry = new Masonry( elem, {
  // options
  itemSelector: '.grid-item',
  columnWidth: 200
});

// element argument can be a selector string
//   for an individual element
var msnry = new Masonry( '.grid', {
  // options
});

*/


let element = document.querySelector('.grid-item');
let msnry = new MasonryJS(element, {
  itemSelector: '.grid-item',
  columnWidth: 250,
  gutter: 5
});

class Notes extends Component {
  //most likely need a get request to my server & db to fetch notes
  //this is for displaying notes, using Masonry.js
  //need user selection function for color themes
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
  backgroundColor: "yellow",
  borderLeft: "5px solid yellow",
  color: "black"
};

class NewNote extends Component {
//this is for creating a new note only
//need post request for this one
//need to clear textarea upon submit or cancel
    render(){
      return (
        <div id="form-container" className='container-fluid' style={defaultStyle}>
          <div id="form">
            <div className="form-group">
            <form action="/notes" method="POST" encType="multipart/form-data">
              <label htmlFor="newNote">New Note:</label>
                <textarea type="text" name="noteText" className="form-control" rows="10" id="newNote"></textarea>
                <button id="done" type="submit" className="btn btn-primary pull-right">Done</button>
                <button id="cancel" className="btn btn-warning pull-right">Cancel</button>
            </form>
            </div>
          </div>
        </div>
      )
    }

}

let sampleNote = {
  text: "Sample Text",
  date: new Date()
};

class App extends Component {

  constructor(){
    super();
    this.state = {
       showHide: false,
       colorTheme: defaultStyle,
       myNotes: []
    };
   // this.showHide = this.showHide.bind(this);
    this.colorTheme = this.colorTheme.bind(this);
 }

 componentDidMount(){
   //request to get users notes from db
  this.fetchMyNotes();
 }
 

 fetchMyNotes(){
   if(this.state.myNotes > 1){
  fetch('/mynotes').then(function(response) {
    return response.json();
  }).then(function(json) {
    console.log(json);
    this.setState({myNotes: json});
  });
  }
  else {
    this.setState({myNotes: sampleNote});
  }

 }


 colorTheme(selection){
    let style;
    if (selection === "dark"){
      style = {
        //dark grey
        backgroundColor: "#6E828A",
        borderLeft: "5 px solid #6E828A",
        color: "white"
      };
    this.setState({colorTheme: style});
      console.log(selection);    
      console.log(this.state.colorTheme);
    }
    else if (selection === "purple"){
      style = {
        backgroundColor: "#780662",
        borderLeft: "5px solid #780662",
        color: "white"
      };
    this.setState({colorTheme: style});
      console.log(selection);        
      console.log(this.state.colorTheme);
    }
    else if (selection === "surpriseme"){
      let color = RandomColor();
      style = {
        backgroundColor: color,
        borderLeft: "5px solid " + color
      };
    this.setState({colorTheme: style});   
      console.log(selection);        
      console.log(this.state.colorTheme);
    }
    else if (selection === "light"){
      style = {
        //light blue color
        backgroundColor: "#0D8ABC",
        borderLeft: "5px solid #0D8ABC",
        color: "black"
      };
    this.setState({colorTheme: style});
      console.log(selection);        
      console.log(this.state.colorTheme);
    }
    else {
      style = {
        backgroundColor: "yellow",
        borderLeft: "5px solid yellow",
        color: "black"
      }; 
      this.setState({colorTheme: style});
      console.log(selection);          
      console.log(this.state.colorTheme);
    }
 }
/*
  showHide(){
    this.setState({showHide: !this.state.showHide});
  }
*/
  render(){
    let noteStyle = this.state.colorTheme;
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
        <div className="text-center"><button className="btn btn-default" onClick={this.fetchMyNotes()} >Fetch My Notes</button></div>
        <div className='text-center'><p className="new-note">Create New Note <i className="btn fa fa-plus-circle" onClick={this.showHide}></i></p></div>
        <NewNote style={this.state.colorTheme} />
        <div className="grid">
        {
          this.state.myNotes.forEach(function(element){
            console.log(element);
            return <Notes text={element.text} date={element.date} colorTheme={noteStyle} />
          })

        }
        </div>
    </div>
    )
  }
}

ReactDOM.render(<App />, document.getElementById('app'));
