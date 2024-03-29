import React, { Component } from "react";
import "./CreateNomination.css";

import { searchMovieResults } from "../../api";
import { MovieSearch, MovieResults, MovieNominations } from "./components";
import { addNominationListToDB } from "../../firebase";

import { Alert } from "antd";

class CreateNomination extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchTerm: "",
      movieResults: [],
      nominatedMovies: [],
      nominatedIDs: [],
      showAlert: {
        maximum: false,
        shareableLink: false,
        empty: false,
      },
      loading: {
        results: false,
        submit: false,
      },
    };
    this.searchMovieResults = this.searchMovieResults.bind(this);
    this.nominateMovie = this.nominateMovie.bind(this);
    this.removeNomination = this.removeNomination.bind(this);
    this.submitNominations = this.submitNominations.bind(this);
  }

  componentDidMount() {
    // Retrieve cached nominated movies
    const nominatedMovies = JSON.parse(localStorage.getItem("nominations"));

    const nominatedIDs = [];
    if (nominatedMovies !== null && nominatedMovies.length > 0) {
      nominatedMovies.forEach((movie) => {
        nominatedIDs.push(movie.imdbID);
      });
      this.setState({ nominatedMovies, nominatedIDs });
    }
  }

  searchMovieResults(searchTerm) {
    this.setState({ searchTerm });
    this.setLoading("results", true);

    searchMovieResults(searchTerm)
      .then((response) => {
        this.setLoading("results", false);
        if (response.Response === "True") {
          // To make sure nominated movies can't be nominated again by refreshing the search
          response.Search.forEach((movie, index, arr) => {
            if (this.state.nominatedIDs.includes(movie.imdbID)) {
              arr[index].nominated = true;
            }
          });

          this.setState({ movieResults: response.Search });
        } else {
          // Handle Error
          this.setState({ movieResults: [] });
        }
      })
      .catch((err) => {
        this.setLoading("results", false);

        // Handle Error
        console.log(err);
      });
  }

  nominateMovie(imdbID) {
    if (this.state.nominatedMovies.length === 5) {
      // Refresh state to force rerender of Alert component each time they try to add another movie
      this.setState(
        (prevState) => ({
          showAlert: { ...prevState.showAlert, maximum: false },
        }),
        () =>
          this.setState((prevState) => ({
            showAlert: { ...prevState.showAlert, maximum: true },
          }))
      );
      window.scrollTo(0, 0);
      return;
    }

    const movieResults = this.state.movieResults.slice(); // Create local copy to change
    let nominatedMovie;
    movieResults.forEach((movie, index, arr) => {
      if (movie.imdbID === imdbID) {
        nominatedMovie = { ...movie };
        arr[index].nominated = true;
      }
    });

    this.setState(
      (prevState) => ({
        movieResults,
        nominatedMovies: [...prevState.nominatedMovies, nominatedMovie],
        nominatedIDs: [...prevState.nominatedIDs, nominatedMovie.imdbID],
      }),
      () => {
        // Saving nominations to local storage
        localStorage.setItem(
          "nominations",
          JSON.stringify(this.state.nominatedMovies)
        );
      }
    );
  }

  removeNomination(imdbID) {
    const movieResults = this.state.movieResults.slice(); // Create local copy to change
    movieResults.forEach((movie, index, arr) => {
      if (movie.imdbID === imdbID) {
        arr[index].nominated = false;
      }
    });

    this.setState(
      (prevState) => ({
        nominatedMovies: prevState.nominatedMovies.filter(
          (movie) => movie.imdbID !== imdbID
        ),
        nominatedIDs: prevState.nominatedIDs.filter((id) => id !== imdbID),
      }),
      () => {
        // Saving nominations to local storage
        localStorage.setItem(
          "nominations",
          JSON.stringify(this.state.nominatedMovies)
        );
      }
    );
  }

  // Add nominations to firebase records
  submitNominations() {
    if (this.state.nominatedMovies.length > 0) {
      this.setLoading("submit", true);
      addNominationListToDB(this.state.nominatedMovies)
        .then((docRef) => {
          console.log("Document written with ID: ", docRef.id);

          this.setLoading("submit", false);
          localStorage.setItem("nominations", JSON.stringify([]));
          this.setState(
            (prevState) => ({
              showAlert: { ...prevState.showAlert, shareableLink: false },
            }),
            () => {
              this.setState((prevState) => ({
                nominatedMovies: [],
                nominatedIDs: [],
                movieResults: [],
                shareableLink: window.location.href + docRef.id,
                showAlert: { ...prevState.showAlert, shareableLink: true },
                searchTerm: "",
              }));
            }
          );
          window.scrollTo(0, 0);
        })
        .catch((error) => {
          console.error("Error adding document: ", error);
          // Handle error
        });
    } else {
      this.setState(
        (prevState) => ({
          showAlert: { ...prevState.showAlert, empty: false },
        }),
        () => {
          this.setState((prevState) => ({
            showAlert: { ...prevState.showAlert, empty: true },
          }));
        }
      );
      window.scrollTo(0, 0);
    }
  }

  // General function to set loading states
  setLoading(identifier, bool) {
    this.setState((prevState) => ({
      loading: { ...prevState.loading, [identifier]: bool },
    }));
  }

  render() {
    const {
      movieResults,
      searchTerm,
      nominatedMovies,
      loading,
      nominatedIDs,
      showAlert,
    } = this.state;

    const { shareableLink, maximum, empty } = showAlert;

    return (
      <div className="create-nomination">
        {maximum ? (
          <Alert
            showIcon
            message="You have already reached the maximum number of nominations"
            type="error"
            closable
            style={{ marginBottom: "10px" }}
          />
        ) : null}{" "}
        {shareableLink ? (
          <Alert
            showIcon
            message={
              <span>
                Successfully submited your nominations! Your shareable link can
                be found here:{" "}
                <a
                  href={this.state.shareableLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  {this.state.shareableLink}
                </a>
              </span>
            }
            type="success"
            closable
            style={{ marginBottom: "10px" }}
          />
        ) : null}
        {empty ? (
          <Alert
            showIcon
            message="You must include atleast 1 movie nomination in your submission"
            type="error"
            closable
            style={{ marginBottom: "10px" }}
          />
        ) : null}
        <div className="create-nomination__title">
          <span>The</span> <span style={{ color: "#008060" }}>Shoppies</span>
        </div>
        <div className="create-nomination__container">
          <MovieSearch
            searchMovieResults={this.searchMovieResults}
          ></MovieSearch>
          <MovieResults
            movieResults={movieResults}
            searchTerm={searchTerm}
            nominateMovie={this.nominateMovie}
            loading={loading.results}
            nominatedIDs={nominatedIDs}
          ></MovieResults>
          <MovieNominations
            nominatedMovies={nominatedMovies}
            removeNomination={this.removeNomination}
            submitNominations={this.submitNominations}
            loading={loading.submit}
          ></MovieNominations>
        </div>
      </div>
    );
  }
}

export default CreateNomination;
